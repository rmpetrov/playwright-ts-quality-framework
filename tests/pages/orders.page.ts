import type { Locator, Page } from '@playwright/test';

export class OrdersPage {
  constructor(private readonly page: Page) {}

  get orderRows(): Locator {
    return this.page.getByRole('table', { name: 'Orders', exact: true }).locator('tbody').getByRole('row');
  }

  row(id: string): Locator {
    return this.orderRows.filter({ has: this.page.getByRole('rowheader', { name: id, exact: true }) });
  }

  async open(): Promise<void> { await this.page.goto('/'); }

  async search(value: string): Promise<void> {
    await this.page.getByRole('searchbox', { name: 'Search orders', exact: true }).fill(value);
  }

  async filterStatus(value: string): Promise<void> {
    await this.page.getByRole('combobox', { name: 'Status filter', exact: true }).selectOption(value);
  }

  async updateStatus(id: string, status: 'processing' | 'shipped' | 'cancelled'): Promise<void> {
    await this.row(id).getByRole('combobox', { name: `New status for ${id}`, exact: true }).selectOption(status);
    await this.row(id).getByRole('button', { name: `Update ${id}`, exact: true }).click();
  }
}
