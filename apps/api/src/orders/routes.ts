import type { FastifyInstance, FastifyRequest } from 'fastify';
import { ApiError } from '../errors.js';
import { toOrder } from '../store/seed.js';
import type { OrderStatus, OrderStore } from '../store/seed.js';
import { canTransition, orderStatuses } from './rules.js';

const paramsSchema = {
  type: 'object', required: ['id'], additionalProperties: false,
  properties: { id: { type: 'string', minLength: 1 } }
};

export async function registerOrderRoutes(
  app: FastifyInstance,
  resolveStore: (request: FastifyRequest) => OrderStore
): Promise<void> {
  await app.register((api, _options, done) => {
    // Reject a missing/unknown namespace before any application route runs.
    api.addHook('preHandler', (request, _reply, next) => { resolveStore(request); next(); });

    api.get<{ Querystring: { status?: OrderStatus; search?: string } }>('/orders', {
      schema: {
        querystring: {
          type: 'object', additionalProperties: false,
          properties: {
            status: { type: 'string', enum: orderStatuses },
            search: { type: 'string', maxLength: 100 }
          }
        }
      }
    }, (request, reply) => {
      const store = resolveStore(request);
      const search = request.query.search?.trim().toLowerCase() ?? '';
      const orders = store.orders.map((order) => toOrder(store, order)).filter((order) => {
        return (!request.query.status || order.status === request.query.status)
          && (!search || order.id.toLowerCase().includes(search) || order.customer.name.toLowerCase().includes(search));
      });
      return reply.send({ orders });
    });

    api.get<{ Params: { id: string } }>('/orders/:id', {
      schema: { params: paramsSchema }
    }, (request, reply) => {
      const store = resolveStore(request);
      const order = store.orders.find((item) => item.id === request.params.id);
      if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found.');
      return reply.send(toOrder(store, order));
    });

    api.patch<{ Params: { id: string }; Body: { status: OrderStatus } }>('/orders/:id/status', {
      schema: {
        params: paramsSchema,
        body: {
          type: 'object', required: ['status'], additionalProperties: false,
          properties: { status: { type: 'string', enum: orderStatuses } }
        }
      }
    }, (request, reply) => {
      const store = resolveStore(request);
      const order = store.orders.find((item) => item.id === request.params.id);
      if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found.');
      if (!canTransition(order.status, request.body.status)) {
        throw new ApiError(409, 'INVALID_TRANSITION', `Cannot change status from ${order.status} to ${request.body.status}.`);
      }
      order.status = request.body.status;
      return reply.send(toOrder(store, order));
    });
    done();
  }, { prefix: '/api' });
}
