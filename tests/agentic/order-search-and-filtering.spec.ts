import { test, expect } from '../fixtures/test.js';

// requirement: REQ-001 — specs/agentic/requirements.md
// spec: specs/agentic/REQ-001.plan.md
// seed: tests/agentic/seed.spec.ts (exploration only; no shared state)

test.describe('REQ-001 — Orders search and status filtering', () => {
  test('REQ-001: pending orders searched with aVA show exactly the two approved Ava Chen orders', async ({ ordersPage, page }) => {
    // Plan step 1: the custom fixtures own a fresh namespace and checked cleanup.
    // Navigate independently through real local HTTP; no search/filter responses are mocked.
    await ordersPage.open();
    await expect(page.getByRole('heading', { name: 'Order Management Console', exact: true })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Orders', exact: true })).toBeVisible();

    const statusFilter = page.getByRole('combobox', { name: 'Status filter', exact: true });
    const searchInput = page.getByRole('searchbox', { name: 'Search orders', exact: true });

    // Plan step 2 / REQ-001 action 1: select and verify the pending filter.
    await ordersPage.filterStatus('pending');
    await expect(statusFilter).toHaveValue('pending');

    // Plan step 3 / REQ-001 action 2: preserve the exact approved search casing.
    await ordersPage.search('aVA');
    await expect(searchInput).toHaveValue('aVA');
    await expect(statusFilter).toHaveValue('pending');

    // Plan step 4 / REQ-001 result 3: exact count plus unique membership, without row ordering.
    await expect(ordersPage.orderRows).toHaveCount(2);
    for (const id of ['ORD-1001', 'ORD-1002']) {
      const row = ordersPage.row(id);
      await expect(row).toHaveCount(1);
      await expect(row.getByRole('rowheader', { name: id, exact: true })).toHaveText(id);

      // Plan step 5 / REQ-001 result 4: verify the customer independently within each order.
      const customerCell = row.getByRole('cell', { name: 'Ava Chen', exact: true });
      await expect(customerCell).toHaveCount(1);
      await expect(customerCell).toBeVisible();

      // Plan step 5 / REQ-001 result 5: verify the status cell independently within each order.
      const statusCell = row.getByRole('cell', { name: 'pending', exact: true });
      await expect(statusCell).toHaveCount(1);
      await expect(statusCell).toBeVisible();
    }

    // Plan step 6: fixture teardown verifies deletion and attaches namespace-cleanup,
    // including after failures. Stage D execution and evidence review require human approval.
  });
});
