import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const environment = z.object({ NODE_ENV: z.enum(['development', 'test', 'production']).default('development'), PORT: z.coerce.number().int().min(1).max(65535).default(3000) }).parse(process.env);
export const env = { nodeEnv: environment.NODE_ENV, port: environment.PORT };
export const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use((request, response, next) => { request.id = request.get('x-request-id') || randomUUID(); response.setHeader('x-request-id', request.id); next(); });
app.get('/api/health', (request, response) => response.status(200).json({ success: true, message: 'SOFOL API is running', data: { environment: env.nodeEnv, status: 'ok', timestamp: new Date().toISOString() } }));
app.use((request, response, next) => next(Object.assign(new Error(`Route ${request.method} ${request.originalUrl} was not found`), { statusCode: 404 })));
app.use((error, request, response, next) => {
  if (response.headersSent) return next(error);
  const statusCode = error.statusCode || 500;
  if (statusCode === 500 && env.nodeEnv !== 'test') console.error({ requestId: request.id, error });
  return response.status(statusCode).json({ success: false, message: statusCode === 500 ? 'An unexpected server error occurred' : error.message, ...(error.details && { error: error.details }) });
});
export function validate(schema) { return (request, response, next) => { const result = schema.safeParse({ body: request.body, params: request.params, query: request.query }); if (!result.success) return next(Object.assign(new Error('Request validation failed'), { statusCode: 400, details: result.error.flatten() })); request.validated = result.data; return next(); }; }