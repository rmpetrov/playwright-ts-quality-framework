import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildApp } from '../../apps/api/src/app.js';
import { testSupportEnabled } from '../../apps/api/src/test-support/config.js';

// Own app instances, no process.env mutation, sockets, or Playwright server fixtures.
await test('namespace management is available only with explicit test configuration', async () => {
  const disabledConfigurations = [
    {},
    { NODE_ENV: 'development' },
    { NODE_ENV: 'production', ENABLE_TEST_SUPPORT: 'false' },
    { NODE_ENV: 'test' },
    { NODE_ENV: 'test', ENABLE_TEST_SUPPORT: 'false' },
    { NODE_ENV: 'test', ENABLE_TEST_SUPPORT: 'TRUE' }
  ];
  for (const environment of disabledConfigurations) {
    const app = await buildApp({ testSupport: testSupportEnabled(environment) });
    try {
      const created = await app.inject({ method: 'POST', url: '/__test/namespaces', payload: { id: 'regression' } });
      assert.equal(created.statusCode, 404);
      assert.deepEqual(created.json(), { code: 'ROUTE_NOT_FOUND', message: 'Route not found.' });
      const deleted = await app.inject({ method: 'DELETE', url: '/__test/namespaces/regression' });
      assert.equal(deleted.statusCode, 404);
      assert.deepEqual(deleted.json(), { code: 'ROUTE_NOT_FOUND', message: 'Route not found.' });
    } finally {
      await app.close();
    }
  }

  for (const environment of [{}, { NODE_ENV: 'development' }, { NODE_ENV: 'production' }]) {
    assert.throws(() => testSupportEnabled({ ...environment, ENABLE_TEST_SUPPORT: 'true' }), {
      message: 'ENABLE_TEST_SUPPORT=true requires NODE_ENV=test.'
    });
  }

  const enabled = await buildApp({ testSupport: testSupportEnabled({ NODE_ENV: 'test', ENABLE_TEST_SUPPORT: 'true' }) });
  try {
    const created = await enabled.inject({ method: 'POST', url: '/__test/namespaces', payload: { id: 'regression' } });
    assert.equal(created.statusCode, 201);
    assert.deepEqual(created.json(), { id: 'regression' });
    const deleted = await enabled.inject({ method: 'DELETE', url: '/__test/namespaces/regression' });
    assert.equal(deleted.statusCode, 204);
    assert.equal(deleted.body, '');
  } finally {
    await enabled.close();
  }
});
