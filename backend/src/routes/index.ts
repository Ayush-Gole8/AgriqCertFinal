import { Router } from 'express';
import authRoutes from './auth.routes.js';
import batchRoutes from './batch.routes.js';
import inspectionRoutes from './inspection.routes.js';
import fileRoutes from './files.routes.js';
import vcRoutes from './vc.routes.js';
import healthRoutes from './health.routes.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { VCController } from '../controllers/vc.controller.js';

const router = Router();

// API routes
router.use('/auth', authRoutes);
router.use('/batches', batchRoutes);
router.use('/inspections', inspectionRoutes);
router.use('/files', fileRoutes);
router.use('/vc', vcRoutes);
router.use('/health', healthRoutes);

router.get(
  '/farmer/certificates',
  authenticate,
  authorize('farmer'),
  VCController.getFarmerCertificates
);
export default router;
