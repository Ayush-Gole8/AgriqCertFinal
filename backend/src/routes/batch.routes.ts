import { Router } from 'express';
import { BatchController } from '../controllers/batch.controller.js';
import { authenticate, authorize, canAccessBatch } from '../middleware/auth.middleware.js';
import { validateSchema, validateQuery } from '../validators/requestValidation.validator.js';
import { validateObjectId } from '../validators/mongoValidation.validator.js';
import {
  createBatchSchema,
  updateBatchSchema,
  batchQuerySchema,
} from '../validators/schemas.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get batches with pagination and filters
router.get('/', validateQuery(batchQuerySchema), BatchController.getBatches);

// Get batch statistics
router.get('/stats', BatchController.getBatchStats);

// Get batch by ID
router.get('/:id', validateObjectId(), canAccessBatch('view'), BatchController.getBatchById);

// Create new batch
router.post('/', authorize('farmer', 'admin'), validateSchema(createBatchSchema), BatchController.createBatch);

// Update batch
router.put('/:id', validateObjectId(), canAccessBatch('edit'), validateSchema(updateBatchSchema), BatchController.updateBatch);

// Submit batch for inspection
router.post('/:id/submit', validateObjectId(), authorize('farmer', 'admin'), BatchController.submitBatch);

// Delete batch
router.delete('/:id', validateObjectId(), authorize('farmer', 'admin'), BatchController.deleteBatch);

export default router;
