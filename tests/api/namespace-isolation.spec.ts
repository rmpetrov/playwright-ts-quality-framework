import { test, expect, apiBaseURL } from '../fixtures/test.js';
import { expectedOrder } from '../data/orders.js';

test('mutating one namespace does not change another namespace', async ({ request, namespace, createNamespace, playwright }) => {
  const otherNamespace = await createNamespace();
  expect(otherNamespace).not.toBe(namespace);
  const other = await playwright.request.newContext({
    baseURL: apiBaseURL, extraHTTPHeaders: { 'x-test-namespace': otherNamespace }
  });
  try {
    const originalA = await request.get('/api/orders/ORD-1001');
    const originalB = await other.get('/api/orders/ORD-1001');
    expect(originalA.status()).toBe(200);
    expect(originalB.status()).toBe(200);
    expect(await originalA.json()).toEqual(expectedOrder());
    expect(await originalB.json()).toEqual(expectedOrder());

    const updated = await request.patch('/api/orders/ORD-1001/status', { data: { status: 'processing' } });
    expect(updated.status()).toBe(200);
    expect(await updated.json()).toEqual(expectedOrder({ status: 'processing' }));

    const readA = await request.get('/api/orders/ORD-1001');
    const readB = await other.get('/api/orders/ORD-1001');
    expect(readA.status()).toBe(200);
    expect(readB.status()).toBe(200);
    expect(await readA.json()).toEqual(expectedOrder({ status: 'processing' }));
    expect(await readB.json()).toEqual(expectedOrder());
  } finally {
    await other.dispose();
  }
  // Both namespaces are deleted by the owning test fixture, even on assertion failure.
});
