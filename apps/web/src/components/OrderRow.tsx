import { useState } from 'react';
import type { Order, OrderStatus } from '../api/orders.js';

export function OrderRow({ order, onUpdate, updating }: {
  order: Order;
  onUpdate: (id: string, status: OrderStatus) => Promise<void>;
  updating: boolean;
}) {
  const [selected, setSelected] = useState<OrderStatus | ''>('');
  const available: OrderStatus[] = order.status === 'pending'
    ? ['processing', 'cancelled']
    : order.status === 'processing' ? ['shipped', 'cancelled'] : [];

  return (
    <tr>
      <th scope="row">{order.id}</th>
      <td>{order.customer.name}</td>
      <td>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(order.totalCents / 100)}</td>
      <td>{order.createdAt.slice(0, 10)}</td>
      <td><span className={`badge ${order.status}`}>{order.status}</span></td>
      <td>
        {available.length === 0 ? <span className="muted">Final status</span> : (
          <div className="status-controls">
            <select
              id={`new-status-${order.id}`}
              aria-label={`New status for ${order.id}`}
              value={available.includes(selected as OrderStatus) ? selected : ''}
              disabled={updating}
              onChange={(event) => { setSelected(event.target.value as OrderStatus | ''); }}
            >
              <option value="">Choose status</option>
              {available.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <button
              type="button"
              aria-label={`Update ${order.id}`}
              disabled={updating || !selected || !available.includes(selected)}
              onClick={() => { if (selected) void onUpdate(order.id, selected); }}
            >Update</button>
          </div>
        )}
      </td>
    </tr>
  );
}
