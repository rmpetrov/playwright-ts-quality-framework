import { useEffect, useRef, useState } from 'react';
import { listOrders, updateStatus } from './api/orders.js';
import type { Order, OrderStatus } from './api/orders.js';
import { OrderRow } from './components/OrderRow.js';

export function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [notice, setNotice] = useState('');
  const [updating, setUpdating] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const searchInput = useRef<HTMLInputElement>(null);
  const updatedFocus = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setUpdateError('');
    void listOrders(search, status, controller.signal).then((items) => {
      if (!controller.signal.aborted) setOrders(items);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Unable to load orders.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => { controller.abort(); };
  }, [search, status, refresh]);

  useEffect(() => {
    if (loading || !updatedFocus.current) return;
    // Refetching replaces the table. Restore the lost position without taking
    // focus from a user who has already moved to another control.
    if (document.activeElement === document.body) {
      (document.getElementById(`new-status-${updatedFocus.current}`) ?? searchInput.current)?.focus();
    }
    updatedFocus.current = null;
  }, [loading, orders]);

  async function changeStatus(id: string, next: OrderStatus): Promise<void> {
    const restoreFocus = document.activeElement?.getAttribute('aria-label') === `Update ${id}`;
    setUpdating(true);
    setUpdateError('');
    setNotice('');
    try {
      const updated = await updateStatus(id, next);
      updatedFocus.current = restoreFocus ? id : null;
      setNotice(`Updated ${updated.id} to ${updated.status}.`);
      setRefresh((value) => value + 1);
    } catch (cause) {
      setUpdateError(cause instanceof Error ? cause.message : 'Unable to update order.');
    } finally {
      setUpdating(false);
    }
  }

  return (
    <main>
      <header>
        <p className="eyebrow">LOCAL TEST FIXTURE</p>
        <h1>Order Management Console</h1>
        <p className="muted">Deterministic orders for exploring API and browser test engineering.</p>
      </header>
      <section aria-label="Order filters" className="filters">
        <label>Search orders
          <input ref={searchInput} type="search" value={search} placeholder="Order ID or customer name" onChange={(event) => { setSearch(event.target.value); }} />
        </label>
        <label>Status filter
          <select value={status} onChange={(event) => { setStatus(event.target.value); }}>
            <option value="">All statuses</option>
            <option value="pending">pending</option>
            <option value="processing">processing</option>
            <option value="shipped">shipped</option>
            <option value="cancelled">cancelled</option>
          </select>
        </label>
      </section>
      {(error || updateError) && <p role="alert">{error || updateError}</p>}
      {notice && <p role="status" className="notice">{notice}</p>}
      {loading ? <p role="status">Loading orders…</p> : !error && (
        orders.length === 0 ? <p role="status">No orders match your filters.</p> : (
          <div className="table-container">
            <table aria-label="Orders">
              <thead><tr><th scope="col">Order</th><th scope="col">Customer</th><th scope="col">Total</th><th scope="col">Created</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
              <tbody>{orders.map((order) => <OrderRow key={order.id} order={order} onUpdate={changeStatus} updating={updating} />)}</tbody>
            </table>
          </div>
        )
      )}
      <footer>Data resets when the server restarts. This console is a portfolio test fixture.</footer>
    </main>
  );
}
