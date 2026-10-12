import assert from 'node:assert/strict';
import { test } from 'node:test';
import { listOrders, updateStatus } from '../../apps/web/src/api/orders.js';
import { expectedOrder } from '../data/orders.js';

const unreadableErrors = [
  '', '{', '<html>Bad gateway</html>', 'null', 'false', '[]', '{}',
  '{"message":42}', '{"message":null}', '{"message":"   "}', '{"error":"Unavailable"}'
];

await test('list errors preserve a useful server message or use a load fallback', async (context) => {
  let response = new Response(null, { status: 502 });
  context.mock.method(globalThis, 'fetch', () => Promise.resolve(response));
  for (const body of unreadableErrors) {
    response = new Response(body, { status: 502 });
    await assert.rejects(listOrders('', '', new AbortController().signal), {
      message: 'Unable to load orders. Please try again.'
    }, `Error body: ${body}`);
  }
  response = new Response('{"code":"UNAVAILABLE","message":"  Orders are unavailable.  "}', { status: 503 });
  await assert.rejects(listOrders('', '', new AbortController().signal), { message: 'Orders are unavailable.' });
});

await test('update errors preserve a useful server message or use an update fallback', async (context) => {
  let response = new Response(null, { status: 502 });
  context.mock.method(globalThis, 'fetch', () => Promise.resolve(response));
  for (const body of unreadableErrors) {
    response = new Response(body, { status: 502 });
    await assert.rejects(updateStatus('ORD-1001', 'processing'), {
      message: 'Unable to update order. Please try again.'
    }, `Error body: ${body}`);
  }
  response = new Response('{"code":"INVALID_TRANSITION","message":"Cannot change status from pending to shipped."}', { status: 409 });
  await assert.rejects(updateStatus('ORD-1001', 'shipped'), { message: 'Cannot change status from pending to shipped.' });
});

await test('successful HTTP responses must contain the expected order shapes', async (context) => {
  let response = new Response();
  context.mock.method(globalThis, 'fetch', () => Promise.resolve(response));
  for (const body of ['', '{', 'null', '{}', '{"orders":{}}', '{"orders":[null]}', '{"orders":[{"id":"ORD-1001"}]}']) {
    response = new Response(body);
    await assert.rejects(listOrders('', '', new AbortController().signal), { message: 'Unable to load orders. Please try again.' });
  }
  for (const body of ['', '{', 'null', '{}', '[]', '{"message":"Unexpected"}', JSON.stringify({ ...expectedOrder(), status: 'delivered' })]) {
    response = new Response(body);
    await assert.rejects(updateStatus('ORD-1001', 'processing'), { message: 'Unable to update order. Please try again.' });
  }
  const order = expectedOrder({ status: 'processing' });
  response = new Response(JSON.stringify({ orders: [order] }));
  assert.deepEqual(await listOrders('', '', new AbortController().signal), [order]);
  response = new Response(JSON.stringify(order));
  assert.deepEqual(await updateStatus('ORD-1001', 'processing'), order);
  response = new Response('{"orders":[]}');
  assert.deepEqual(await listOrders('', '', new AbortController().signal), []);
});
