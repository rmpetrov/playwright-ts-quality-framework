import { test, expect } from '../fixtures/test.js';
import { expectedAvaPendingOrders, expectedSeededOrders } from '../data/orders.js';
import type { ExpectedOrder } from '../data/orders.js';

const [avaFirst, avaSecond, noahProcessing, miaShipped, noahCancelled, miaPending] = expectedSeededOrders;

const searchScenarios = [
  { name: 'finds an order by case-insensitive ID', params: { search: 'oRd-1003' }, orders: [noahProcessing] },
  { name: 'finds customer orders across statuses case-insensitively', params: { search: 'nOaH wIlLiAmS' }, orders: [noahProcessing, noahCancelled] },
  { name: 'trims leading and trailing search whitespace', params: { search: ' \tMiA pAtEl\n ' }, orders: [miaShipped, miaPending] },
  { name: 'combines status and case-insensitive customer search', params: { status: 'pending', search: 'aVA' }, orders: expectedAvaPendingOrders },
  { name: 'returns no orders for an unmatched search', params: { search: 'no-such-customer' }, orders: [] },
  { name: 'returns no orders when matching customer orders have another status', params: { status: 'shipped', search: 'aVA' }, orders: [] }
] satisfies { name: string; params: { search: string; status?: ExpectedOrder['status'] }; orders: readonly ExpectedOrder[] }[];

for (const { name, params, orders } of searchScenarios) {
  test(name, async ({ request }) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await request.get('/api/orders', { params });
      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual({ orders });
    }

    const listing = await request.get('/api/orders');
    expect(listing.status()).toBe(200);
    expect(await listing.json()).toEqual({ orders: expectedSeededOrders });
  });
}

test('status-only filters return each seeded group in deterministic order', async ({ request }) => {
  const scenarios = [
    { status: 'pending', orders: [avaFirst, avaSecond, miaPending] },
    { status: 'processing', orders: [noahProcessing] },
    { status: 'shipped', orders: [miaShipped] },
    { status: 'cancelled', orders: [noahCancelled] }
  ] as const;

  for (const { status, orders } of scenarios) {
    await test.step(`filters ${status} orders`, async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        const response = await request.get('/api/orders', { params: { status } });
        expect(response.status()).toBe(200);
        expect(await response.json()).toEqual({ orders });
      }
    });
  }

  const listing = await request.get('/api/orders');
  expect(listing.status()).toBe(200);
  expect(await listing.json()).toEqual({ orders: expectedSeededOrders });
});

test('enforces the 100-character search boundary before trimming whitespace', async ({ request }) => {
  for (const length of [99, 100, 101]) {
    await test.step(`search with ${length} characters`, async () => {
      const search = ` ${'ORD-1001'.padEnd(length - 1, ' ')}`;
      expect(search).toHaveLength(length);
      const response = await request.get('/api/orders', { params: { search } });
      expect(response.status()).toBe(length <= 100 ? 200 : 400);
      expect(await response.json()).toEqual(length <= 100
        ? { orders: [avaFirst] }
        : { code: 'VALIDATION_ERROR', message: 'Request validation failed.' });

      const listing = await request.get('/api/orders');
      expect(listing.status()).toBe(200);
      expect(await listing.json()).toEqual({ orders: expectedSeededOrders });
    });
  }
});

const invalidQueries = [
  { name: 'unsupported status values', queries: ['status=delivered', 'status=PENDING', 'status='] },
  { name: 'unknown query parameters', queries: ['status=pending&customer=Ava'] },
  // Repeated keys express arrays over HTTP; bracket syntax would only be an unknown parameter.
  { name: 'repeated search or status parameters', queries: ['status=pending&status=processing', 'search=ava&search=noah'] }
];

for (const { name, queries } of invalidQueries) {
  test(`rejects ${name} without changing stored orders`, async ({ request }) => {
    for (const query of queries) {
      await test.step(query, async () => {
        const response = await request.get(`/api/orders?${query}`);
        expect(response.status()).toBe(400);
        expect(await response.json()).toEqual({ code: 'VALIDATION_ERROR', message: 'Request validation failed.' });

        const listing = await request.get('/api/orders');
        expect(listing.status()).toBe(200);
        expect(await listing.json()).toEqual({ orders: expectedSeededOrders });
      });
    }
  });
}
