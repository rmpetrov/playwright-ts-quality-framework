import { test, expect } from '../fixtures/test.js';
import { expectedSeededOrders } from '../data/orders.js';
import type { ExpectedOrder } from '../data/orders.js';

const [pendingOrder, , processingOrder, shippedOrder, cancelledOrder] = expectedSeededOrders;

// Explicit test-owned outcomes cover all 16 status pairs; never derive these from application rules.
const allowedTransitions = [
  { order: pendingOrder, to: 'processing' },
  { order: pendingOrder, to: 'cancelled' },
  { order: processingOrder, to: 'shipped' },
  { order: processingOrder, to: 'cancelled' }
] satisfies { order: ExpectedOrder; to: ExpectedOrder['status'] }[];

for (const { order, to } of allowedTransitions) {
  test(`persists the allowed ${order.status} to ${to} transition`, async ({ request }) => {
    const updatedOrder = { ...order, status: to };
    const response = await request.patch(`/api/orders/${order.id}/status`, { data: { status: to } });
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual(updatedOrder);

    const read = await request.get(`/api/orders/${order.id}`);
    expect(read.status()).toBe(200);
    expect(await read.json()).toEqual(updatedOrder);

    const listing = await request.get('/api/orders');
    expect(listing.status()).toBe(200);
    expect(await listing.json()).toEqual({
      orders: expectedSeededOrders.map((seeded) => seeded.id === order.id ? updatedOrder : seeded)
    });
  });
}

const rejectedTransitions = [
  { name: 'pending same-status and skipped processing updates', order: pendingOrder, targets: ['pending', 'shipped'] },
  { name: 'processing same-status and backward updates', order: processingOrder, targets: ['processing', 'pending'] },
  { name: 'every update from terminal shipped', order: shippedOrder, targets: ['pending', 'processing', 'shipped', 'cancelled'] },
  { name: 'every update from terminal cancelled', order: cancelledOrder, targets: ['pending', 'processing', 'shipped', 'cancelled'] }
] satisfies { name: string; order: ExpectedOrder; targets: ExpectedOrder['status'][] }[];

for (const { name, order, targets } of rejectedTransitions) {
  test(`rejects ${name} without changing stored orders`, async ({ request }) => {
    for (const to of targets) {
      await test.step(`${order.status} to ${to} returns 409 and leaves the store unchanged`, async () => {
        const response = await request.patch(`/api/orders/${order.id}/status`, { data: { status: to } });
        expect(response.status()).toBe(409);
        expect(await response.json()).toEqual({
          code: 'INVALID_TRANSITION', message: `Cannot change status from ${order.status} to ${to}.`
        });

        const read = await request.get(`/api/orders/${order.id}`);
        expect(read.status()).toBe(200);
        expect(await read.json()).toEqual(order);

        const listing = await request.get('/api/orders');
        expect(listing.status()).toBe(200);
        expect(await listing.json()).toEqual({ orders: expectedSeededOrders });
      });
    }
  });
}

test('fulfils a pending order through processing and shipped, then rejects further updates', async ({ request }) => {
  const initial = await request.get('/api/orders/ORD-1001');
  expect(initial.status()).toBe(200);
  expect(await initial.json()).toEqual(pendingOrder);

  for (const status of ['processing', 'shipped'] as const) {
    await test.step(`persists ${status} through real HTTP requests`, async () => {
      const response = await request.patch('/api/orders/ORD-1001/status', { data: { status } });
      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual({ ...pendingOrder, status });

      const read = await request.get('/api/orders/ORD-1001');
      expect(read.status()).toBe(200);
      expect(await read.json()).toEqual({ ...pendingOrder, status });
    });
  }

  for (const status of ['pending', 'processing', 'shipped', 'cancelled'] as const) {
    await test.step(`rejects shipped to ${status} after fulfilment`, async () => {
      const response = await request.patch('/api/orders/ORD-1001/status', { data: { status } });
      expect(response.status()).toBe(409);
      expect(await response.json()).toEqual({
        code: 'INVALID_TRANSITION', message: `Cannot change status from shipped to ${status}.`
      });

      const read = await request.get('/api/orders/ORD-1001');
      expect(read.status()).toBe(200);
      expect(await read.json()).toEqual({ ...pendingOrder, status: 'shipped' });

      const listing = await request.get('/api/orders');
      expect(listing.status()).toBe(200);
      expect(await listing.json()).toEqual({
        orders: expectedSeededOrders.map((order) => order.id === pendingOrder.id ? { ...pendingOrder, status: 'shipped' } : order)
      });
    });
  }
});
