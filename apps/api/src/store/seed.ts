export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'cancelled';

export interface Customer {
  id: string;
  name: string;
}

export interface StoredOrder {
  id: string;
  customerId: string;
  status: OrderStatus;
  totalCents: number;
  createdAt: string;
}

export interface Order extends Omit<StoredOrder, 'customerId'> {
  customer: Customer;
}

export interface OrderStore {
  customers: Customer[];
  orders: StoredOrder[];
}

// Fresh objects on every call: namespaces never share mutable seed references.
export function createSeed(): OrderStore {
  return {
    customers: [
      { id: 'CUST-001', name: 'Ava Chen' },
      { id: 'CUST-002', name: 'Noah Williams' },
      { id: 'CUST-003', name: 'Mia Patel' }
    ],
    orders: [
      { id: 'ORD-1001', customerId: 'CUST-001', status: 'pending', totalCents: 12900, createdAt: '2026-01-05T10:00:00.000Z' },
      { id: 'ORD-1002', customerId: 'CUST-001', status: 'pending', totalCents: 4500, createdAt: '2026-01-06T10:00:00.000Z' },
      { id: 'ORD-1003', customerId: 'CUST-002', status: 'processing', totalCents: 7800, createdAt: '2026-01-07T10:00:00.000Z' },
      { id: 'ORD-1004', customerId: 'CUST-003', status: 'shipped', totalCents: 22000, createdAt: '2026-01-08T10:00:00.000Z' },
      { id: 'ORD-1005', customerId: 'CUST-002', status: 'cancelled', totalCents: 3500, createdAt: '2026-01-09T10:00:00.000Z' },
      { id: 'ORD-1006', customerId: 'CUST-003', status: 'pending', totalCents: 9900, createdAt: '2026-01-10T10:00:00.000Z' }
    ]
  };
}

export function toOrder(store: OrderStore, order: StoredOrder): Order {
  const customer = store.customers.find((item) => item.id === order.customerId);
  if (!customer) throw new Error(`Missing customer for ${order.id}`);
  return {
    id: order.id,
    customer: { ...customer },
    status: order.status,
    totalCents: order.totalCents,
    createdAt: order.createdAt
  };
}
