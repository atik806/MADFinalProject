import cors = require('cors');
import express = require('express');
import farmerRoutes from './modules/farmer/farmer.routes';
import adminRoutes from './modules/admin/admin.routes';
import fieldOfficerRoutes from './modules/fieldOfficer/fieldOfficer.routes';
import bankOfficerRoutes from './modules/bankOfficer/bankOfficer.routes';
import { corsMiddleware, helmetMiddleware, authLimiter, adminMutationLimiter } from './middleware/security.middleware';

const app = express();

// Security headers before anything else so every response (including
// errors) carries them.
app.use(helmetMiddleware);

// CORS is allow-list driven (CORS_ORIGINS); dev defaults cover Expo web,
// Expo Go and the Android emulator. See security.middleware.ts.
app.use(corsMiddleware);

// Hard cap on request bodies. The largest legitimate JSON payloads are
// farmer registrations and loan applications (a few KB); 1 MiB leaves an
// order of magnitude of headroom while stopping oversized-payload abuse.
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Sofol api is running' });
});

// farmer module api
app.use('/api/farmer', farmerRoutes);

// admin module api
app.use('/api/admin', adminRoutes);

// field-officer module api
app.use('/api/field-officer', fieldOfficerRoutes);

// bank-officer module api
app.use('/api/bank-officer', bankOfficerRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ message: 'Api endpoint not found!' });
});

// error handling middleware — never leak stack traces to the client.
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) return next(err);
  // Body-parser JSON syntax errors surface as 400 with a safe message.
  if (err?.type === 'entity.parse.failed' || err?.status === 400) {
    return res.status(400).json({ message: 'Invalid JSON body' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request body too large' });
  }
  console.error('Unhandled error:', err?.stack ?? err);
  res.status(500).json({ message: 'Internal server error' });
});

export = app;
