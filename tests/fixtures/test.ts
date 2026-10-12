import { randomUUID } from 'node:crypto';
import { test as base, expect } from '@playwright/test';
import { OrdersPage } from '../pages/orders.page.js';

export const apiBaseURL = 'http://127.0.0.1:3001';

interface Fixtures {
  createNamespace: () => Promise<string>;
  namespace: string;
  ordersPage: OrdersPage;
}

export const test = base.extend<Fixtures>({
  createNamespace: async ({ playwright }, use, testInfo) => {
    const management = await playwright.request.newContext({ baseURL: apiBaseURL });
    const owned: string[] = [];
    const cleanup: { id: string; deleted: boolean; error?: string }[] = [];
    try {
      await use(async () => {
        const id = randomUUID();
        const response = await management.post('/__test/namespaces', { data: { id } });
        if (response.status() === 201) owned.push(id);
        expect(response.status(), 'Namespace creation must succeed').toBe(201);
        expect(await response.json()).toEqual({ id });
        return id;
      });
    } finally {
      try {
        // A failed test still reaches this block. Attempt every deletion even if one fails.
        for (const id of owned) {
          try {
            const deleted = await management.delete(`/__test/namespaces/${id}`);
            expect(deleted.status(), 'Namespace deletion must succeed').toBe(204);
            const read = await management.get('/api/orders', { headers: { 'x-test-namespace': id } });
            expect(read.status(), 'Deleted namespaces must be inaccessible').toBe(404);
            expect(await read.json()).toEqual({ code: 'NAMESPACE_NOT_FOUND', message: 'Namespace not found.' });
            cleanup.push({ id, deleted: true });
          } catch (error) {
            cleanup.push({ id, deleted: false, error: String(error) });
          }
        }
        await testInfo.attach('namespace-cleanup', {
          body: JSON.stringify(cleanup, null, 2), contentType: 'application/json'
        });
        expect(cleanup.filter((item) => !item.deleted), 'All owned namespaces must be removed').toEqual([]);
      } finally {
        await management.dispose();
      }
    }
  },
  namespace: async ({ createNamespace }, use) => { await use(await createNamespace()); },
  extraHTTPHeaders: async ({ namespace }, use) => { await use({ 'x-test-namespace': namespace }); },
  request: async ({ playwright, namespace }, use) => {
    const api = await playwright.request.newContext({
      baseURL: apiBaseURL, extraHTTPHeaders: { 'x-test-namespace': namespace }
    });
    try { await use(api); } finally { await api.dispose(); }
  },
  ordersPage: async ({ page }, use) => { await use(new OrdersPage(page)); }
});

export { expect } from '@playwright/test';
