// Test-owned contracts and expectations; never import application rules or seed.
export interface ExpectedOrder {
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

export const expectedSeededOrders = [
  expectedOrder(),
  expectedOrder({ id: 'ORD-1002', totalCents: 4500, createdAt: '2026-01-06T10:00:00.000Z' }),
  expectedOrder({
    id: 'ORD-1003', customer: { id: 'CUST-002', name: 'Noah Williams' }, status: 'processing',
    totalCents: 7800, createdAt: '2026-01-07T10:00:00.000Z'
  }),
  expectedOrder({
    id: 'ORD-1004', customer: { id: 'CUST-003', name: 'Mia Patel' }, status: 'shipped',
    totalCents: 22000, createdAt: '2026-01-08T10:00:00.000Z'
  }),
  expectedOrder({
    id: 'ORD-1005', customer: { id: 'CUST-002', name: 'Noah Williams' }, status: 'cancelled',
    totalCents: 3500, createdAt: '2026-01-09T10:00:00.000Z'
  }),
  expectedOrder({
    id: 'ORD-1006', customer: { id: 'CUST-003', name: 'Mia Patel' },
    totalCents: 9900, createdAt: '2026-01-10T10:00:00.000Z'
  })
] as const;
