// Test-owned contracts and expectations; never import application rules or seed.
interface ExpectedOrder {
  id: string;
  customer: { id: string; name: string };
  status: 'pending' | 'processing' | 'shipped' | 'cancelled';
  totalCents: number;
  createdAt: string;
}

export function expectedOrder(overrides: Partial<ExpectedOrder> = {}): ExpectedOrder {
  return {
    id: 'ORD-1001',
    customer: { id: 'CUST-001', name: 'Ava Chen' },
    status: 'pending',
    totalCents: 12900,
    createdAt: '2026-01-05T10:00:00.000Z',
    ...overrides
  };
}

export const expectedAvaPendingOrders = [
  expectedOrder(),
  expectedOrder({ id: 'ORD-1002', totalCents: 4500, createdAt: '2026-01-06T10:00:00.000Z' })
];
