import { test, expect } from '../fixtures/test.js';

// Exploration bootstrap only; REQ-001 belongs in a separately approved generated test.
test('seed opens Orders with isolated browser and API access', async ({ ordersPage, page, namespace, request }) => {
  const [listing] = await Promise.all([
    page.waitForRequest((candidate) =>
      candidate.method() === 'GET' && new URL(candidate.url()).pathname === '/api/orders'
    ),
    ordersPage.open()
  ]);

  expect((await listing.allHeaders())['x-test-namespace']).toBe(namespace);
  await expect(page.getByRole('heading', { name: 'Order Management Console', exact: true })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Orders', exact: true })).toBeVisible();

  const response = await request.get('/api/orders');
  expect(response.status()).toBe(200);
  // The owning custom fixture verifies deletion and attaches namespace-cleanup after this test.
});
