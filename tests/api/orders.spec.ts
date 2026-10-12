import { test, expect } from '../fixtures/test.js';
import { expectedOrder } from '../data/orders.js';

test('rejects invalid status payloads without modifying the order', async ({ request }) => {
  for (const data of [{ status: 'delivered' }, {}, { status: 1 }, { status: 'processing', extra: true }]) {
    const response = await request.patch('/api/orders/ORD-1001/status', { data });
    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual({ code: 'VALIDATION_ERROR', message: 'Request validation failed.' });
  }
  const malformed = await request.patch('/api/orders/ORD-1001/status', {
    headers: { 'Content-Type': 'application/json' }, data: Buffer.from('{')
  });
  expect(malformed.status()).toBe(400);
  expect(await malformed.json()).toEqual({ code: 'BAD_REQUEST', message: 'Malformed JSON body.' });
  const read = await request.get('/api/orders/ORD-1001');
  expect(read.status()).toBe(200);
  expect(await read.json()).toEqual(expectedOrder());
});

test('returns a consistent 404 for an unknown order', async ({ request }) => {
  const response = await request.get('/api/orders/ORD-9999');
  expect(response.status()).toBe(404);
  expect(await response.json()).toEqual({ code: 'ORDER_NOT_FOUND', message: 'Order not found.' });
});
