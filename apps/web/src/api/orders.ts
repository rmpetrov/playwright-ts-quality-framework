export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'cancelled';

export interface Order {
  id: string;
  customer: { id: string; name: string };
  status: OrderStatus;
  totalCents: number;
  createdAt: string;
}

async function errorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (body !== null && typeof body === 'object' && !Array.isArray(body)
      && 'message' in body && typeof body.message === 'string' && body.message.trim()) {
      return body.message.trim();
    }
  } catch {
    // Empty bodies, HTML, and malformed JSON should not expose parser errors to the UI.
  }
  return fallback;
}

function isOrder(value: unknown): value is Order {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const order = value as Record<string, unknown>;
  const customer = order.customer;
  return typeof order.id === 'string' && order.id.length > 0
    && customer !== null && typeof customer === 'object' && !Array.isArray(customer)
    && 'id' in customer && typeof customer.id === 'string' && customer.id.length > 0
    && 'name' in customer && typeof customer.name === 'string' && customer.name.length > 0
    && (order.status === 'pending' || order.status === 'processing' || order.status === 'shipped' || order.status === 'cancelled')
    && typeof order.totalCents === 'number' && Number.isSafeInteger(order.totalCents) && order.totalCents >= 0
    && typeof order.createdAt === 'string' && order.createdAt.length > 0;
}

export async function listOrders(search: string, status: string, signal: AbortSignal): Promise<Order[]> {
  const fallback = 'Unable to load orders. Please try again.';
  const query = new URLSearchParams();
  if (search) query.set('search', search);
  if (status) query.set('status', status);
  let response: Response;
  try {
    response = await fetch(`/api/orders?${query.toString()}`, { signal });
  } catch (cause) {
    if (signal.aborted) throw cause;
    throw new Error(fallback, { cause });
  }
  if (!response.ok) throw new Error(await errorMessage(response, fallback));
  let body: unknown;
  try { body = await response.json(); } catch { throw new Error(fallback); }
  if (body === null || typeof body !== 'object' || !('orders' in body)
    || !Array.isArray(body.orders) || !body.orders.every(isOrder)) {
    throw new Error(fallback);
  }
  return body.orders;
}

export async function updateStatus(id: string, status: OrderStatus): Promise<Order> {
  const fallback = 'Unable to update order. Please try again.';
  let response: Response;
  try {
    response = await fetch(`/api/orders/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
  } catch (cause) {
    throw new Error(fallback, { cause });
  }
  if (!response.ok) throw new Error(await errorMessage(response, fallback));
  let body: unknown;
  try { body = await response.json(); } catch { throw new Error(fallback); }
  if (!isOrder(body)) throw new Error(fallback);
  return body;
}
