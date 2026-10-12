import type { Locator } from '@playwright/test';
import { test, expect } from '../fixtures/test.js';
import { expectedOrder, expectedSeededOrders } from '../data/orders.js';
import { expectAccessible } from '../helpers/accessibility.js';

const listingURL = (url: URL): boolean => url.origin === 'http://127.0.0.1:5173' && url.pathname === '/api/orders';
const patchURL = 'http://127.0.0.1:5173/api/orders/ORD-1001/status';

// This small fixture uses opaque, solid surfaces; gradients/images need manual review.
function controlAppearance(element: HTMLElement | SVGElement) {
  const style = getComputedStyle(element);
  let surface = element.parentElement;
  while (surface && getComputedStyle(surface).backgroundColor === 'rgba(0, 0, 0, 0)') {
    surface = surface.parentElement;
  }
  const background = getComputedStyle(surface ?? document.documentElement).backgroundColor;
  const luminance = (color: string): number => (color.match(/[\d.]+/g) ?? []).slice(0, 3)
    .map((channel) => Number(channel) / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * ([0.2126, 0.7152, 0.0722][index] ?? 0), 0);
  const foregroundLight = luminance(style.outlineColor);
  const backgroundLight = luminance(background);
  const contrast = (first: number, second: number): number =>
    (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
  return {
    visible: element.matches(':focus-visible'), style: style.outlineStyle,
    width: parseFloat(style.outlineWidth), offset: parseFloat(style.outlineOffset),
    focusContrast: contrast(foregroundLight, backgroundLight),
    borderContrast: Math.min(
      contrast(luminance(style.borderTopColor), backgroundLight),
      contrast(luminance(style.borderTopColor), luminance(style.backgroundColor))
    )
  };
}

async function expectVisibleFocus(control: Locator): Promise<void> {
  await expect(control).toBeVisible();
  await expect(control).toBeFocused();
  const outline = await control.evaluate(controlAppearance);
  expect(outline.visible, 'Keyboard focus must match :focus-visible').toBe(true);
  expect(outline.style).toBe('solid');
  expect(outline.width, 'Focus outline must be readily visible').toBeGreaterThanOrEqual(2);
  expect(outline.offset).toBeGreaterThanOrEqual(2);
  expect(outline.focusContrast, 'Focus outline must contrast with its surrounding solid surface').toBeGreaterThanOrEqual(3);
}

test('loaded orders expose labelled controls and semantic table headers without WCAG violations', async ({ page, ordersPage }, testInfo) => {
  await ordersPage.open();
  await expect(ordersPage.orderRows.getByRole('rowheader')).toHaveText(expectedSeededOrders.map((order) => order.id));
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('main')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Order Management Console');
  await expect(page.getByRole('searchbox', { name: 'Search orders', exact: true })).toBeEnabled();
  await expect(page.getByRole('combobox', { name: 'Status filter', exact: true })).toBeEnabled();
  await expect(page.getByRole('columnheader')).toHaveText(['Order', 'Customer', 'Total', 'Created', 'Status', 'Actions']);
  for (const control of [page.getByRole('searchbox'), ...await page.getByRole('combobox').all()]) {
    const appearance = await control.evaluate(controlAppearance);
    expect(appearance.borderContrast, 'Enabled input/select boundaries need 3:1 contrast against adjacent surfaces').toBeGreaterThanOrEqual(3);
  }
  for (const order of expectedSeededOrders) {
    await expect(ordersPage.row(order.id).getByRole('rowheader')).toHaveAttribute('scope', 'row');
  }
  await expectAccessible(page, testInfo, 'loaded');
});

test('keyboard search and filtering expose accessible results and an announced empty state', async ({ page, ordersPage }, testInfo) => {
  await ordersPage.open();
  await expect(ordersPage.orderRows).toHaveCount(6);
  const search = page.getByRole('searchbox', { name: 'Search orders', exact: true });
  const filter = page.getByRole('combobox', { name: 'Status filter', exact: true });
  await page.keyboard.press('Tab');
  await expectVisibleFocus(search);
  await search.pressSequentially('Mia');
  await expect(ordersPage.orderRows.getByRole('rowheader')).toHaveText(['ORD-1004', 'ORD-1006']);
  await page.keyboard.press('Tab');
  await expectVisibleFocus(filter);
  // Native select type-ahead chooses the first matching option without an OS popup.
  await page.keyboard.press('p');
  await expect(filter).toHaveValue('pending');
  // Moving to the preceding input also commits select type-ahead in WebKit.
  await page.keyboard.press('Shift+Tab');
  await expectVisibleFocus(search);
  await expect(ordersPage.orderRows.getByRole('rowheader')).toHaveText(['ORD-1006']);
  await expect(ordersPage.orderRows.getByRole('cell', { name: 'pending', exact: true })).toHaveCount(1);
  await expect(page.getByRole('status')).toHaveCount(0);
  await expectAccessible(page, testInfo, 'filtered');

  await search.press('ControlOrMeta+A');
  await search.pressSequentially('no-such-customer');
  await expect(page.getByRole('status')).toHaveText('No orders match your filters.');
  await expect(page.getByRole('status')).toBeVisible();
  await expect(page.getByRole('table', { name: 'Orders', exact: true })).toHaveCount(0);
  await expectAccessible(page, testInfo, 'empty');
});

for (const transition of [
  { from: 'pending', to: 'processing', key: 'p' },
  { from: 'processing', to: 'shipped', key: 's' }
] as const) {
  test(`keyboard ${transition.from} to ${transition.to} update announces success, persists, and restores focus`, async ({ page, ordersPage, request, browserName }, testInfo) => {
    if (transition.from === 'processing') {
      const setup = await request.patch('/api/orders/ORD-1001/status', { data: { status: 'processing' } });
      expect(setup.status()).toBe(200);
      expect(await setup.json()).toEqual(expectedOrder({ status: 'processing' }));
    }
    await ordersPage.open();
    const row = ordersPage.row('ORD-1001');
    await expect(row.getByRole('cell', { name: transition.from, exact: true })).toBeVisible();
    const selector = row.getByRole('combobox', { name: 'New status for ORD-1001', exact: true });
    const button = row.getByRole('button', { name: 'Update ORD-1001', exact: true });
    // Check each semantic neighbour; no blind page-wide Tab count or mouse actions.
    await page.keyboard.press('Tab');
    await expect(page.getByRole('searchbox', { name: 'Search orders', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('combobox', { name: 'Status filter', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expectVisibleFocus(selector);
    await expect(button).toBeDisabled();
    await page.keyboard.press(transition.key);
    await expect(selector).toHaveValue(transition.to);
    // Blur to commit WebKit's native type-ahead before traversing enabled controls.
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('combobox', { name: 'Status filter', exact: true })).toBeFocused();
    await expect(button).toBeEnabled();
    await page.keyboard.press('Tab');
    await expectVisibleFocus(selector);
    // macOS WebKit uses Option+Tab to include buttons in native keyboard traversal.
    await page.keyboard.press(browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab');
    await expectVisibleFocus(button);
    await page.keyboard.press('Enter');
    const notice = `Updated ORD-1001 to ${transition.to}.`;
    await expect(page.getByRole('status').filter({ hasText: notice })).toHaveText(notice);
    await expect(row.getByRole('cell', { name: transition.to, exact: true })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Loading orders…' })).toHaveCount(0);
    await expect(page.getByRole('alert')).toHaveCount(0);
    const persisted = await request.get('/api/orders/ORD-1001');
    expect(persisted.status()).toBe(200);
    expect(await persisted.json()).toEqual(expectedOrder({ status: transition.to }));
    if (transition.to === 'shipped') {
      await expect(row.getByRole('cell', { name: 'Final status', exact: true })).toBeVisible();
      await expect(selector).toHaveCount(0);
      await expect(button).toHaveCount(0);
      await expectVisibleFocus(page.getByRole('searchbox', { name: 'Search orders', exact: true }));
    } else {
      await expectVisibleFocus(selector);
    }
    await expectAccessible(page, testInfo, `updated-${transition.to}`);
  });
}

test('keyboard focus moves forward and backward, skips disabled updates and terminal rows', async ({ page, ordersPage }) => {
  await ordersPage.open();
  await expect(ordersPage.orderRows).toHaveCount(6);
  const search = page.getByRole('searchbox', { name: 'Search orders', exact: true });
  const filter = page.getByRole('combobox', { name: 'Status filter', exact: true });
  const selectors = ['ORD-1001', 'ORD-1002', 'ORD-1003', 'ORD-1006'].map((id) =>
    ordersPage.row(id).getByRole('combobox', { name: `New status for ${id}`, exact: true }));
  for (const id of ['ORD-1004', 'ORD-1005']) {
    await expect(ordersPage.row(id).getByRole('cell', { name: 'Final status', exact: true })).toBeVisible();
    await expect(ordersPage.row(id).getByRole('combobox')).toHaveCount(0);
    await expect(ordersPage.row(id).getByRole('button')).toHaveCount(0);
  }
  let patches = 0;
  page.on('request', (request) => { if (request.method() === 'PATCH') patches += 1; });
  for (const control of [search, filter, ...selectors]) {
    await page.keyboard.press('Tab');
    await expectVisibleFocus(control);
  }
  // End-of-table focus can return through the entire application; no focus trap.
  for (const control of [...selectors.slice(0, -1).reverse(), filter, search]) {
    await page.keyboard.press('Shift+Tab');
    await expectVisibleFocus(control);
  }
  const disabled = ordersPage.row('ORD-1001').getByRole('button', { name: 'Update ORD-1001', exact: true });
  await expect(disabled).toBeDisabled();
  await disabled.focus();
  await expect(search).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(ordersPage.row('ORD-1001').getByRole('cell', { name: 'pending', exact: true })).toBeVisible();
  expect(patches, 'A disabled update cannot receive keyboard focus or submit').toBe(0);
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('controlled loading exposes a meaningful status without WCAG violations', async ({ page, ordersPage }, testInfo) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route(listingURL, async (route) => {
    if (route.request().method() !== 'GET') { await route.fallback(); return; }
    await held;
    await route.continue();
  });
  try {
    await ordersPage.open();
    await expect(page.getByRole('status')).toHaveText('Loading orders…');
    await expect(page.getByRole('status')).toBeVisible();
    await expect(page.getByRole('table', { name: 'Orders', exact: true })).toHaveCount(0);
    await expectAccessible(page, testInfo, 'loading');
    release();
    await expect(ordersPage.orderRows).toHaveCount(6);
    await expect(page.getByRole('status')).toHaveCount(0);
  } finally {
    release();
    await page.unrouteAll({ behavior: 'wait' });
  }
});

test('listing failure exposes an accessible alert and labelled usable filters', async ({ page, ordersPage }, testInfo) => {
  await page.route(listingURL, async (route) => {
    if (route.request().method() !== 'GET') { await route.fallback(); return; }
    await route.fulfill({
      status: 500, contentType: 'application/json',
      body: JSON.stringify({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' })
    });
  });
  await ordersPage.open();
  await expect(page.getByRole('alert')).toHaveText('An unexpected error occurred.');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByRole('table', { name: 'Orders', exact: true })).toHaveCount(0);
  await expect(page.getByRole('searchbox', { name: 'Search orders', exact: true })).toBeEnabled();
  await expect(page.getByRole('combobox', { name: 'Status filter', exact: true })).toBeEnabled();
  await expectAccessible(page, testInfo, 'listing-error');
});

test('failed PATCH exposes an accessible alert while retaining usable order controls and no success', async ({ page, ordersPage }, testInfo) => {
  await page.route(patchURL, async (route) => {
    if (route.request().method() !== 'PATCH') { await route.fallback(); return; }
    await route.fulfill({
      status: 503, contentType: 'application/json',
      body: JSON.stringify({ code: 'UNAVAILABLE', message: 'Order updates are unavailable.' })
    });
  });
  await ordersPage.open();
  await expect(ordersPage.orderRows).toHaveCount(6);
  await ordersPage.updateStatus('ORD-1001', 'processing');
  await expect(page.getByRole('alert')).toHaveText('Order updates are unavailable.');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
  const row = ordersPage.row('ORD-1001');
  await expect(row.getByRole('cell', { name: 'pending', exact: true })).toBeVisible();
  await expect(row.getByRole('combobox', { name: 'New status for ORD-1001', exact: true })).toBeEnabled();
  await expect(row.getByRole('button', { name: 'Update ORD-1001', exact: true })).toBeEnabled();
  await expectAccessible(page, testInfo, 'update-error');
});
