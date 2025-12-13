import { Router } from 'express';
import authRoutes from './auth.routes.js';
import batchRoutes from './batch.routes.js';
import inspectionRoutes from './inspection.routes.js';
import fileRoutes from './files.routes.js';
import vcRoutes from './vc.routes.js';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'AgriQCert API is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/batches', batchRoutes);
router.use('/inspections', inspectionRoutes);
router.use('/files', fileRoutes);
router.use('/vc', vcRoutes);

export default router;
