import type { OrderStatus } from '../store/seed.js';

export const orderStatuses: OrderStatus[] = ['pending', 'processing', 'shipped', 'cancelled'];

const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: [],
  cancelled: []
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return transitions[from].includes(to);
}
