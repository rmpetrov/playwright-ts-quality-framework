import type { FastifyInstance } from 'fastify';
import { ApiError } from '../errors.js';
import { createSeed } from '../store/seed.js';
import type { OrderStore } from '../store/seed.js';

const namespaceId = { type: 'string', pattern: '^[a-zA-Z0-9-]{1,80}$' };

export async function registerNamespaceRoutes(app: FastifyInstance, stores: Map<string, OrderStore>): Promise<void> {
  await app.register((support, _options, done) => {
    support.post<{ Body: { id: string } }>('/namespaces', {
      schema: {
        body: {
          type: 'object', required: ['id'], additionalProperties: false,
          properties: { id: namespaceId }
        }
      }
    }, (request, reply) => {
      const { id } = request.body;
      if (stores.has(id)) throw new ApiError(409, 'NAMESPACE_EXISTS', 'Namespace already exists.');
      stores.set(id, createSeed());
      return reply.code(201).send({ id });
    });

    support.delete<{ Params: { id: string } }>('/namespaces/:id', {
      schema: {
        params: {
          type: 'object', required: ['id'], additionalProperties: false,
          properties: { id: namespaceId }
        }
      }
    }, (request, reply) => {
      if (!stores.delete(request.params.id)) throw new ApiError(404, 'NAMESPACE_NOT_FOUND', 'Namespace not found.');
      return reply.code(204).send();
    });
    done();
  }, { prefix: '/__test' });
}
