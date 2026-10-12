import Fastify from 'fastify';
import { ApiError, registerErrorHandlers } from './errors.js';
import { registerOrderRoutes } from './orders/routes.js';
import { createSeed } from './store/seed.js';
import type { OrderStore } from './store/seed.js';
import { registerNamespaceRoutes } from './test-support/namespaces.js';

export async function buildApp(options: { testSupport: boolean; logger?: boolean }) {
  const app = Fastify({
    logger: options.logger ?? false,
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false, useDefaults: false } }
  });
  const defaultStore = createSeed();
  const namespaces = new Map<string, OrderStore>();
  registerErrorHandlers(app);
  app.get('/health', (_request, reply) => reply.send({ status: 'ok' }));

  await registerOrderRoutes(app, (request) => {
    if (!options.testSupport) return defaultStore;
    const id = request.headers['x-test-namespace'];
    if (typeof id !== 'string' || !id) {
      throw new ApiError(400, 'NAMESPACE_REQUIRED', 'A test namespace header is required.');
    }
    const store = namespaces.get(id);
    if (!store) throw new ApiError(404, 'NAMESPACE_NOT_FOUND', 'Namespace not found.');
    return store;
  });
  if (options.testSupport) await registerNamespaceRoutes(app, namespaces);
  await app.ready();
  return app;
}
