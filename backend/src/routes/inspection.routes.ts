import { Router } from 'express';
import { InspectionController } from '../controllers/inspection.controller.js';
import { authenticate, authorize, canAccessBatch } from '../middleware/auth.middleware.js';
import { validateSchema, validateQuery } from '../validators/requestValidation.validator.js';
import { validateObjectId } from '../validators/mongoValidation.validator.js';
import {
  createInspectionSchema,
  updateInspectionSchema,
  inspectionQuerySchema,
} from '../validators/schemas.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get inspections with pagination and filters
router.get('/', validateQuery(inspectionQuerySchema), InspectionController.getInspections);

// Get inspection by ID
router.get('/:id', validateObjectId(), InspectionController.getInspectionById);

// Create new inspection for a batch
router.post('/batch/:batchId',
  validateObjectId('batchId'),
  authorize('qa_inspector', 'admin'),
  validateSchema(createInspectionSchema),
  InspectionController.createInspection
);

// Update inspection
router.put('/:id',
  validateObjectId(),
  authorize('qa_inspector', 'admin'),
  validateSchema(updateInspectionSchema),
  InspectionController.updateInspection
);

// Complete inspection
router.post('/:id/complete',
  validateObjectId(),
  authorize('qa_inspector', 'admin'),
  InspectionController.completeInspection
);

// Save inspection draft
router.post('/:id/draft',
  validateObjectId(),
  authorize('qa_inspector', 'admin'),
  InspectionController.saveDraft
);

// Get validation rules for batch
router.get('/batch/:batchId/validation-rules',
  validateObjectId('batchId'),
  authorize('qa_inspector', 'admin'),
  InspectionController.getValidationRules
);

// Get inspections for a specific batch
router.get('/batch/:batchId',
  validateObjectId('batchId'),
  canAccessBatch('view'),
  InspectionController.getInspectionsByBatch
);

export default router;
