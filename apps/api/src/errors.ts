import type { FastifyError, FastifyInstance } from 'fastify';

export class ApiError extends Error {
  constructor(public readonly statusCode: number, public readonly code: string, message: string) {
    super(message);
  }
}

export function registerErrorHandlers(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError) {
      return reply.code(error.statusCode).send({ code: error.code, message: error.message });
    }
    // Fastify accepts thrown unknown values; narrow before inspecting its metadata.
    const fastifyError = error instanceof Error ? error as FastifyError : undefined;
    if (fastifyError?.validation) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'Request validation failed.' });
    }
    if (fastifyError?.code === 'FST_ERR_CTP_INVALID_JSON_BODY' || fastifyError?.code === 'FST_ERR_CTP_EMPTY_JSON_BODY') {
      return reply.code(400).send({ code: 'BAD_REQUEST', message: 'Malformed JSON body.' });
    }
    if (fastifyError?.statusCode && fastifyError.statusCode >= 400 && fastifyError.statusCode < 500) {
      return reply.code(fastifyError.statusCode).send({ code: fastifyError.code ?? 'BAD_REQUEST', message: fastifyError.message });
    }
    request.log.error(error);
    return reply.code(500).send({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' });
  });
  app.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send({ code: 'ROUTE_NOT_FOUND', message: 'Route not found.' });
  });
}
