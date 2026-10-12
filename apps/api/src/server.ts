import { buildApp } from './app.js';
import { testSupportEnabled } from './test-support/config.js';

const app = await buildApp({ testSupport: testSupportEnabled(process.env), logger: true });
await app.listen({ host: '127.0.0.1', port: 3001 });

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void app.close().catch((error: unknown) => {
      app.log.error(error);
      process.exitCode = 1;
    });
  });
}
