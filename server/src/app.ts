import cors = require('cors');
import express = require('express');
import farmerRoutes from './modules/farmer/farmer.routes';
import adminRoutes from './modules/admin/admin.routes';
import fieldOfficerRoutes from './modules/fieldOfficer/fieldOfficer.routes';
import bankOfficerRoutes from './modules/bankOfficer/bankOfficer.routes';

const app = express();

// using middleware to allow cross-origin requests from any origin
app.use(
  cors({
    origin: '*',
  }),
);
app.use(express.json());

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

// error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

export = app;
