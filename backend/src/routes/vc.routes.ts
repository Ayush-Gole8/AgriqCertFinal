import { Router } from 'express';
import { VCController } from '../controllers/VCController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateSchema } from '../middleware/validation.js';
import { validateObjectId } from '../middleware/paramValidation.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const issueVCSchema = z.object({
  batchId: z.string().min(1, 'Batch ID is required'),
  inspectionId: z.string().optional(),
});

const verifyVCSchema = z.object({
  vcJson: z.record(z.any()).optional(),
  vcUrl: z.string().url().optional(),
  qrPayload: z.string().optional(),
}).refine(
  (data) => data.vcJson || data.vcUrl || data.qrPayload,
  {
    message: 'One of vcJson, vcUrl, or qrPayload is required',
  }
);

const revokeCertificateSchema = z.object({
  reason: z.enum([
    'compromised_key',
    'cessation_of_operation',
    'affiliation_changed',
    'superseded',
    'fraud',
    'quality_issue',
    'expired_inspection',
    'administrative',
    'other'
  ]),
});

// All routes except webhook and verify require authentication
router.use('/webhook', (_req, _res, next) => {
  // Skip auth for webhook
  next();
});

router.use('/verify', (_req, _res, next) => {
  // Skip auth for verify (public endpoint)
  next();
});

router.use(authenticate);

/**
 * @route POST /api/vc/issue
 * @desc Issue a new Verifiable Credential
 * @access qa_inspector, certifier, admin
 */
router.post('/issue',
  authorize('qa_inspector', 'certifier', 'admin'),
  validateSchema(issueVCSchema),
  VCController.issueVC
);

/**
 * @route GET /api/vc/jobs/:jobId
 * @desc Get issuance job status
 * @access qa_inspector, certifier, admin, farmer (for their own batches)
 */
router.get('/jobs/:jobId',
  validateObjectId('jobId'),
  VCController.getJobStatus
);

/**
 * @route GET /api/vc/certificates/:id
 * @desc Get certificate by ID
 * @access Authenticated users
 */
router.get('/certificates/:id',
  validateObjectId('id'),
  VCController.getCertificate
);

/**
 * @route GET /api/vc/certificates/batch/:batchId
 * @desc Get certificate by batch ID
 * @access Authenticated users
 */
router.get('/certificates/batch/:batchId',
  validateObjectId('batchId'),
  VCController.getCertificateByBatch
);

/**
 * @route POST /api/vc/certificates/:id/revoke
 * @desc Revoke a certificate
 * @access admin, certifier
 */
router.post('/certificates/:id/revoke',
  validateObjectId('id'),
  authorize('admin', 'certifier'),
  validateSchema(revokeCertificateSchema),
  VCController.revokeCertificate
);

/**
 * @route GET /api/vc/stats
 * @desc Get VC statistics
 * @access admin, certifier
 */
router.get('/stats',
  authorize('admin', 'certifier'),
  VCController.getVCStats
);

// Public endpoints (no auth required)

/**
 * @route POST /api/vc/verify
 * @desc Verify a Verifiable Credential
 * @access Public
 */
router.post('/verify',
  validateSchema(verifyVCSchema),
  VCController.verifyVC
);

/**
 * @route POST /api/vc/webhook
 * @desc Handle webhook from Inji provider
 * @access Public (with signature verification)
 */
router.post('/webhook',
  VCController.handleWebhook
);

export default router;