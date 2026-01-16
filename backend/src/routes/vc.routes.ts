import { Router } from 'express';
import { VCController } from '../controllers/vc.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateSchema } from '../validators/requestValidation.validator.js';
import { validateObjectId } from '../validators/mongoValidation.validator.js';
import {
  issueVCSchema,
  verifyVCSchema,
  revokeCertificateSchema,
} from '../validators/schemas.js';

const router = Router();


router.post('/issue',
  authenticate,
  authorize('qa_inspector', 'certifier', 'admin'),
  validateSchema(issueVCSchema),
  VCController.issueVC
);


router.get('/jobs/:jobId',
  authenticate,
  validateObjectId('jobId'),
  VCController.getJobStatus
);


router.get('/certificates/:id',
  authenticate,
  validateObjectId('id'),
  VCController.getCertificate
);


router.get('/certificates/batch/:batchId',
  authenticate,
  validateObjectId('batchId'),
  VCController.getCertificateByBatch
);


router.post('/certificates/:id/revoke',
  authenticate,
  validateObjectId('id'),
  authorize('admin', 'certifier'),
  validateSchema(revokeCertificateSchema),
  VCController.revokeCertificate
);


router.get('/stats',
  authenticate,
  authorize('admin', 'certifier'),
  VCController.getVCStats
);

// Public endpoints (no auth required)


router.post('/verify',
  validateSchema(verifyVCSchema),
  VCController.verifyVC
);


router.post('/webhook',
  VCController.handleWebhook
);

export default router;
