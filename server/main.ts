import express from 'express';
import path from 'node:path';
import * as PaymentController from './controllers/payment-controller';
import * as AdminController from './controllers/admin-controller';
import { authenticateAdmin } from './middleware/auth-middleware';
import GoogleAuthService from './services/google/google-auth-service';

(async () => {
  await GoogleAuthService.init();

  const app = express();
  const PORT = 3000;

  const rootDir = path.join(__dirname, '..');
  app.use(express.json());
  app.use(express.static(path.join(rootDir, 'dist')));

  // Payment endpoints
  app.get('/api/paymentMethods', PaymentController.paymentMethodsHandler);
  app.get('/api/paymentData', PaymentController.paymentDataHandler);
  app.get('/api/totalDonations', PaymentController.totalDonationsHandler);
  app.post('/api/createOrder', PaymentController.createOrder);
  app.post('/api/paymentNotify', PaymentController.paymentNotifyHandler);
  app.get('/api/paymentReturn', PaymentController.paymentReturnHandler);

  // Admin endpoints
  app.post('/api/admin/login', AdminController.loginHandler);
  app.get('/api/admin/verify', authenticateAdmin, AdminController.verifyHandler);
  app.get('/api/admin/goals', authenticateAdmin, AdminController.listGoalsHandler);
  app.post('/api/admin/goals', authenticateAdmin, AdminController.createGoalHandler);
  app.put('/api/admin/goals/:id', authenticateAdmin, AdminController.updateGoalHandler);
  app.delete('/api/admin/goals/:id', authenticateAdmin, AdminController.deleteGoalHandler);

  app.get('/{*all}', (req, res) => {
    res.sendFile(path.join(rootDir, 'dist', 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
})();
