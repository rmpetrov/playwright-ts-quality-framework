import { test, expect } from '../fixtures/test.js';
import { expectedOrder } from '../data/orders.js';

test('searches and filters the seeded orders and displays an empty state', async ({ ordersPage, page }) => {
  await ordersPage.open();
  await expect(page.getByRole('heading', { name: 'Order Management Console', exact: true })).toBeVisible();
  await ordersPage.filterStatus('pending');
  await ordersPage.search('aVA');
  await expect(ordersPage.orderRows).toHaveCount(2);
  await expect(ordersPage.orderRows.getByRole('rowheader')).toHaveText(['ORD-1001', 'ORD-1002']);
  await expect(ordersPage.orderRows.getByRole('cell', { name: 'Ava Chen', exact: true })).toHaveCount(2);
  await expect(ordersPage.orderRows.getByRole('cell', { name: 'pending', exact: true })).toHaveCount(2);
  await ordersPage.search('no-such-customer');
  await expect(page.getByRole('status')).toHaveText('No orders match your filters.');
  await expect(page.getByRole('table', { name: 'Orders', exact: true })).toHaveCount(0);
});

test('updates an order through the UI and persists it across reload', async ({ ordersPage, page, request }) => {
  await ordersPage.open();
  await expect(ordersPage.row('ORD-1001').getByRole('cell', { name: 'pending', exact: true })).toBeVisible();
  await ordersPage.updateStatus('ORD-1001', 'processing');
  await expect(page.getByRole('status').filter({ hasText: 'Updated ORD-1001 to processing.' })).toBeVisible();
  await expect(ordersPage.row('ORD-1001').getByRole('cell', { name: 'processing', exact: true })).toBeVisible();

  // Real API read proves the browser's namespace header survived the Vite proxy.
  const response = await request.get('/api/orders/ORD-1001');
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual(expectedOrder({ status: 'processing' }));

  await page.reload();
  await expect(ordersPage.row('ORD-1001').getByRole('cell', { name: 'processing', exact: true })).toBeVisible();
  await expect(ordersPage.row('ORD-1002').getByRole('cell', { name: 'pending', exact: true })).toBeVisible();
});
