import type { Route } from '@playwright/test';
import { test, expect } from '../fixtures/test.js';
import { expectedOrder, expectedSeededOrders } from '../data/orders.js';

const listingURL = (url: URL): boolean => url.origin === 'http://127.0.0.1:5173' && url.pathname === '/api/orders';
const patchURL = 'http://127.0.0.1:5173/api/orders/ORD-1001/status';
const loadFallback = 'Unable to load orders. Please try again.';
const updateFallback = 'Unable to update order. Please try again.';

// Each test owns its gates. Cleanup releases them even when an assertion fails.
function gate(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((complete) => { resolve = complete; });
  return { promise, resolve };
}

const listingFailures = [
  {
    name: 'HTTP 500 with the JSON error contract', status: 500, contentType: 'application/json',
    body: JSON.stringify({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' }),
    message: 'An unexpected error occurred.'
  },
  {
    name: 'HTTP 503 with HTML', status: 503, contentType: 'text/html',
    body: '<html><body>Service unavailable</body></html>', message: loadFallback
  },
  {
    name: 'HTTP 200 with malformed JSON', status: 200, contentType: 'application/json',
    body: '{', message: loadFallback
  },
  {
    name: 'HTTP 200 with an invalid order among valid orders', status: 200, contentType: 'application/json',
    body: JSON.stringify({ orders: [expectedOrder(), { ...expectedOrder({ id: 'INVALID-ORDER' }), customer: null }] }),
    message: loadFallback
  },
  {
    name: 'a network failure', status: null, contentType: '', body: '', message: loadFallback
  }
] as const;

for (const failure of listingFailures) {
  test(`listing recovers from ${failure.name} after reload`, async ({ page, ordersPage, request, namespace }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => { pageErrors.push(error.message); });
    const intercepted: (string | undefined)[] = [];
    const handler = async (route: Route): Promise<void> => {
      if (route.request().method() !== 'GET') { await route.fallback(); return; }
      intercepted.push(route.request().headers()['x-test-namespace']);
      if (failure.status === null) await route.abort('failed');
      else await route.fulfill({ status: failure.status, contentType: failure.contentType, body: failure.body });
    };
    await page.route(listingURL, handler);
    await ordersPage.open();

    // Exact public messages also exclude HTML and internal JSON/fetch errors.
    await expect(page.getByRole('alert')).toHaveText(failure.message);
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.getByRole('table', { name: 'Orders', exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Order Management Console', exact: true })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Search orders', exact: true })).toBeEnabled();
    expect(intercepted).toEqual([namespace]);
    const unchanged = await request.get('/api/orders');
    expect(unchanged.status()).toBe(200);
    expect(await unchanged.json()).toEqual({ orders: expectedSeededOrders });

    await page.unroute(listingURL, handler);
    await page.reload();
    await expect(ordersPage.orderRows.getByRole('rowheader')).toHaveText(expectedSeededOrders.map((order) => order.id));
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('status').filter({ hasText: 'Loading orders…' })).toHaveCount(0);
    expect(pageErrors).toEqual([]);
    const recovered = await request.get('/api/orders');
    expect(recovered.status()).toBe(200);
    expect(await recovered.json()).toEqual({ orders: expectedSeededOrders });
  });
}

const updateFailures = [
  {
    name: 'HTTP 503', status: 503,
    body: JSON.stringify({ code: 'UNAVAILABLE', message: 'Order updates are unavailable.' }),
    message: 'Order updates are unavailable.'
  },
  {
    // A simulated stale-client conflict uses the documented contract. The real store is still pending.
    name: 'HTTP 409 business conflict', status: 409,
    body: JSON.stringify({ code: 'INVALID_TRANSITION', message: 'Cannot change status from shipped to processing.' }),
    message: 'Cannot change status from shipped to processing.'
  },
  { name: 'a network failure', status: null, body: '', message: updateFallback },
  { name: 'HTTP 200 with malformed JSON', status: 200, body: '{', message: updateFallback },
  {
    name: 'HTTP 200 with an invalid order', status: 200,
    body: JSON.stringify({ ...expectedOrder({ status: 'processing' }), customer: null }), message: updateFallback
  }
] as const;

for (const failure of updateFailures) {
  test(`status update recovers from ${failure.name} without false persistence`, async ({ page, ordersPage, request, namespace }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => { pageErrors.push(error.message); });
    await ordersPage.open();
    const row = ordersPage.row('ORD-1001');
    const selector = row.getByRole('combobox', { name: 'New status for ORD-1001', exact: true });
    const button = row.getByRole('button', { name: 'Update ORD-1001', exact: true });
    await expect(row.getByRole('cell', { name: 'pending', exact: true })).toBeVisible();
    const entered = gate();
    const release = gate();
    const intercepted: { namespace: string | undefined; body: unknown }[] = [];
    const handler = async (route: Route): Promise<void> => {
      if (route.request().method() !== 'PATCH') { await route.fallback(); return; }
      intercepted.push({ namespace: route.request().headers()['x-test-namespace'], body: route.request().postDataJSON() as unknown });
      entered.resolve();
      await release.promise;
      // Do not forward the PATCH: these failures must not mutate the real namespace.
      if (failure.status === null) await route.abort('failed');
      else await route.fulfill({ status: failure.status, contentType: 'application/json', body: failure.body });
    };
    await page.route(patchURL, handler);
    try {
      await ordersPage.updateStatus('ORD-1001', 'processing');
      await entered.promise;
      await expect(selector).toBeDisabled();
      await expect(button).toBeDisabled();
      await expect(row.getByRole('cell', { name: 'pending', exact: true })).toBeVisible();
      await expect(page.getByRole('status').filter({ hasText: 'Updated' })).toHaveCount(0);
      release.resolve();

      await expect(page.getByRole('alert')).toHaveText(failure.message);
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(page.getByRole('status').filter({ hasText: 'Updated' })).toHaveCount(0);
      await expect(row.getByRole('cell', { name: 'pending', exact: true })).toBeVisible();
      await expect(row.getByRole('cell', { name: 'processing', exact: true })).toHaveCount(0);
      await expect(selector).toBeEnabled();
      await expect(button).toBeEnabled();
      expect(intercepted).toEqual([{ namespace, body: { status: 'processing' } }]);

      // APIRequestContext bypasses browser interception and reads Fastify directly.
      const persisted = await request.get('/api/orders/ORD-1001');
      expect(persisted.status()).toBe(200);
      expect(await persisted.json()).toEqual(expectedOrder());
      const unchanged = await request.get('/api/orders');
      expect(unchanged.status()).toBe(200);
      expect(await unchanged.json()).toEqual({ orders: expectedSeededOrders });

      await page.unroute(patchURL, handler);
      await button.click();
      await expect(page.getByRole('status').filter({ hasText: 'Updated ORD-1001 to processing.' })).toHaveText('Updated ORD-1001 to processing.');
      await expect(row.getByRole('cell', { name: 'processing', exact: true })).toBeVisible();
      await expect(page.getByRole('alert')).toHaveCount(0);
      await expect(selector).toBeEnabled();
      const recovered = await request.get('/api/orders');
      expect(recovered.status()).toBe(200);
      expect(await recovered.json()).toEqual({
        orders: [expectedOrder({ status: 'processing' }), ...expectedSeededOrders.slice(1)]
      });
      expect(pageErrors).toEqual([]);
    } finally {
      release.resolve();
      await page.unrouteAll({ behavior: 'wait' });
    }
  });
}

test('listing stays loading until a controlled real response is released', async ({ page, ordersPage, request, namespace }) => {
  const entered = gate();
  const release = gate();
  const handler = async (route: Route): Promise<void> => {
    if (route.request().method() !== 'GET') { await route.fallback(); return; }
    expect(route.request().headers()['x-test-namespace']).toBe(namespace);
    entered.resolve();
    await release.promise;
    await route.continue();
  };
  await page.route(listingURL, handler);
  try {
    await ordersPage.open();
    await entered.promise;
    await expect(page.getByRole('status')).toHaveText('Loading orders…');
    await expect(page.getByRole('status')).toBeVisible();
    await expect(page.getByRole('table', { name: 'Orders', exact: true })).toHaveCount(0);
    await expect(page.getByRole('alert')).toHaveCount(0);
    release.resolve();
    await expect(ordersPage.orderRows.getByRole('rowheader')).toHaveText(expectedSeededOrders.map((order) => order.id));
    await expect(page.getByRole('status')).toHaveCount(0);
    const unchanged = await request.get('/api/orders');
    expect(unchanged.status()).toBe(200);
    expect(await unchanged.json()).toEqual({ orders: expectedSeededOrders });
  } finally {
    release.resolve();
    await page.unrouteAll({ behavior: 'wait' });
  }
});

test('an obsolete delayed filter request cannot replace a newer search result', async ({ page, ordersPage, request, namespace }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => { pageErrors.push(error.message); });
  await ordersPage.open();
  await expect(ordersPage.orderRows).toHaveCount(6);
  const captured = gate();
  const release = gate();
  const completed = gate();
  const isObsolete = (url: URL): boolean => listingURL(url) && url.searchParams.get('status') === 'pending' && !url.searchParams.has('search');
  const handler = async (route: Route): Promise<void> => {
    if (route.request().method() !== 'GET') { await route.fallback(); return; }
    expect(route.request().headers()['x-test-namespace']).toBe(namespace);
    // Capture a genuine older backend result before changing search, then withhold it.
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ orders: [expectedSeededOrders[0], expectedSeededOrders[1], expectedSeededOrders[5]] });
    captured.resolve();
    try {
      await release.promise;
      await route.fulfill({ response });
    } finally { completed.resolve(); }
  };
  await page.route(isObsolete, handler);
  try {
    await ordersPage.filterStatus('pending');
    await captured.promise;
    await expect(page.getByRole('status')).toHaveText('Loading orders…');
    const cancelled = page.waitForEvent('requestfailed', {
      predicate: (event) => event.method() === 'GET' && isObsolete(new URL(event.url()))
    });
    const latestResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return listingURL(url) && url.searchParams.get('status') === 'pending' && url.searchParams.get('search') === 'ORD-1002';
    });
    await ordersPage.search('ORD-1002');
    const latest = await latestResponse;
    expect(latest.status()).toBe(200);
    expect(await latest.json()).toEqual({ orders: [expectedSeededOrders[1]] });
    await expect(ordersPage.orderRows.getByRole('rowheader')).toHaveText(['ORD-1002']);
    await expect(page.getByRole('alert')).toHaveCount(0);

    release.resolve();
    await completed.promise;
    const obsolete = await cancelled;
    expect(obsolete.failure()).not.toBeNull();
    await expect(ordersPage.orderRows.getByRole('rowheader')).toHaveText(['ORD-1002']);
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(pageErrors).toEqual([]);
    const unchanged = await request.get('/api/orders');
    expect(unchanged.status()).toBe(200);
    expect(await unchanged.json()).toEqual({ orders: expectedSeededOrders });
  } finally {
    release.resolve();
    await page.unrouteAll({ behavior: 'wait' });
  }
});
