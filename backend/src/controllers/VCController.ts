import { Request, Response } from 'express';
import { IssuanceJob, Certificate, Revocation, Batch, Inspection, Notification } from '../models/index.js';
import { verifyService } from '../services/verifyService.js';
import { injiClient } from '../services/injiClient.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AppError } from '../middleware/errorHandler.js';

export class VCController {
  /**
   * Issue a Verifiable Credential
   * POST /api/vc/issue
   */
  static issueVC = asyncHandler(async (req: Request, res: Response) => {
    const { batchId, inspectionId } = req.body;
    
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    // Validate batch exists
    const batch = await Batch.findById(batchId);
    if (!batch) {
      throw new AppError(404, 'Batch not found');
    }

    // Validate inspection if provided
    let inspection = null;
    if (inspectionId) {
      inspection = await Inspection.findById(inspectionId);
      if (!inspection) {
        throw new AppError(404, 'Inspection not found');
      }

      if (inspection.batchId !== batchId) {
        throw new AppError(400, 'Inspection does not belong to the specified batch');
      }

      if (inspection.status !== 'completed' || inspection.outcome?.classification !== 'pass') {
        throw new AppError(400, 'Inspection must be completed and passed to issue certificate');
      }
    }

    // Check if certificate already exists
    const existingCertificate = await Certificate.findOne({ batchId });
    if (existingCertificate) {
      throw new AppError(409, 'Certificate already exists for this batch');
    }

    // Check if job already exists
    const existingJob = await IssuanceJob.findOne({ 
      batchId,
      status: { $in: ['pending', 'processing'] }
    });
    if (existingJob) {
      res.status(202).json({
        success: true,
        message: 'Issuance job already queued',
        data: {
          jobId: existingJob.id,
          status: existingJob.status,
          createdAt: existingJob.createdAt,
        },
      });
      return;
    }

    // Create issuance job
    const job = await IssuanceJob.create({
      batchId,
      inspectionId,
      status: 'pending',
      payload: {
        requestedBy: req.user.userId,
        requestedAt: new Date(),
        batchData: {
          id: batch.id,
          productType: batch.productType,
          productName: batch.productName,
        },
      },
    });

    res.status(202).json({
      success: true,
      message: 'Issuance job queued successfully',
      data: {
        jobId: job.id,
        status: job.status,
        batchId,
        inspectionId,
        createdAt: job.createdAt,
      },
    });
  });

  /**
   * Get issuance job status
   * GET /api/vc/jobs/:jobId
   */
  static getJobStatus = asyncHandler(async (req: Request, res: Response) => {
    const { jobId } = req.params;
    
    const job = await IssuanceJob.findById(jobId);
    if (!job) {
      throw new AppError(404, 'Job not found');
    }

    res.json({
      success: true,
      data: {
        id: job.id,
        batchId: job.batchId,
        inspectionId: job.inspectionId,
        status: job.status,
        attempts: job.attempts,
        lastError: job.lastError,
        result: job.result,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      },
    });
  });

  /**
   * Get certificate by ID
   * GET /api/vc/certificates/:id
   */
  static getCertificate = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const certificate = await Certificate.findById(id)
      .populate('batchId', 'productType productName quantity unit farmerId farmerName')
      .populate('issuedBy', 'name email role');
    
    if (!certificate) {
      throw new AppError(404, 'Certificate not found');
    }

    res.json({
      success: true,
      data: {
        id: certificate.id,
        batchId: certificate.batchId,
        vc: certificate.vc,
        providerVcId: certificate.providerVcId,
        vcUrl: certificate.vcUrl,
        vcHash: certificate.vcHash,
        qrCodeData: certificate.qrCodeData,
        status: certificate.status,
        revoked: certificate.revoked,
        issuedBy: certificate.issuedBy,
        issuedAt: certificate.issuedAt,
        expiresAt: certificate.expiresAt,
        revokedAt: certificate.revokedAt,
        revokedBy: certificate.revokedBy,
        revocationReason: certificate.revocationReason,
        metadata: certificate.metadata,
      },
    });
  });

  /**
   * Get certificate by batch ID
   * GET /api/vc/certificates/batch/:batchId
   */
  static getCertificateByBatch = asyncHandler(async (req: Request, res: Response) => {
    const { batchId } = req.params;
    
    const certificate = await Certificate.findOne({ batchId })
      .populate('batchId', 'productType productName quantity unit farmerId farmerName')
      .populate('issuedBy', 'name email role');
    
    if (!certificate) {
      throw new AppError(404, 'Certificate not found for this batch');
    }

    res.json({
      success: true,
      data: {
        id: certificate.id,
        batchId: certificate.batchId,
        vc: certificate.vc,
        providerVcId: certificate.providerVcId,
        vcUrl: certificate.vcUrl,
        vcHash: certificate.vcHash,
        qrCodeData: certificate.qrCodeData,
        status: certificate.status,
        revoked: certificate.revoked,
        issuedBy: certificate.issuedBy,
        issuedAt: certificate.issuedAt,
        expiresAt: certificate.expiresAt,
        revokedAt: certificate.revokedAt,
        revokedBy: certificate.revokedBy,
        revocationReason: certificate.revocationReason,
        metadata: certificate.metadata,
      },
    });
  });

  /**
   * Verify a Verifiable Credential
   * POST /api/vc/verify
   */
  static verifyVC = asyncHandler(async (req: Request, res: Response) => {
    const { vcJson, vcUrl, qrPayload } = req.body;

    if (!vcJson && !vcUrl && !qrPayload) {
      throw new AppError(400, 'One of vcJson, vcUrl, or qrPayload is required');
    }

    const result = await verifyService.verify({
      vcJson,
      vcUrl,
      qrPayload,
    });

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Revoke a certificate
   * POST /api/vc/certificates/:id/revoke
   */
  static revokeCertificate = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    if (!reason) {
      throw new AppError(400, 'Revocation reason is required');
    }

    const certificate = await Certificate.findById(id);
    if (!certificate) {
      throw new AppError(404, 'Certificate not found');
    }

    if (certificate.revoked) {
      throw new AppError(409, 'Certificate is already revoked');
    }

    // Mark certificate as revoked
    certificate.revoked = true;
    certificate.status = 'revoked';
    certificate.revokedAt = new Date();
    certificate.revokedBy = req.user.userId;
    certificate.revocationReason = reason;
    await certificate.save();

    // Create revocation record
    const revocation = await Revocation.create({
      certificateId: certificate.id,
      providerVcId: certificate.providerVcId,
      vcHash: certificate.vcHash,
      revokedBy: req.user.userId,
      reason,
      metadata: {
        revokedVia: 'api',
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      },
    });

    // Create notification for batch owner
    const batch = await Batch.findById(certificate.batchId);
    if (batch) {
      await Notification.create({
        userId: batch.farmerId,
        type: 'certificate_revoked',
        title: 'Certificate Revoked',
        message: `Your certificate for batch ${batch.id} (${batch.productName}) has been revoked. Reason: ${reason}`,
        data: {
          certificateId: certificate.id,
          batchId: batch.id,
          reason,
        },
        priority: 'high',
      });
    }

    res.json({
      success: true,
      message: 'Certificate revoked successfully',
      data: {
        certificateId: certificate.id,
        revocationId: revocation.id,
        revokedAt: certificate.revokedAt,
        reason,
      },
    });
  });

  /**
   * Handle Inji webhook
   * POST /api/vc/webhook
   */
  static handleWebhook = asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers['x-inji-signature'] as string;
    
    if (!signature) {
      throw new AppError(400, 'Missing webhook signature');
    }

    try {
      const payload = injiClient.parseWebhook(JSON.stringify(req.body), signature);
      
      // Handle different webhook events
      switch (payload.status) {
        case 'issued':
          await VCController.handleIssuedWebhook(payload);
          break;
        case 'revoked':
          await VCController.handleRevokedWebhook(payload);
          break;
        case 'expired':
          await VCController.handleExpiredWebhook(payload);
          break;
        default:
          console.warn('[VCController] Unknown webhook status:', payload.status);
      }

      res.json({
        success: true,
        message: 'Webhook processed successfully',
      });
    } catch (error) {
      console.error('[VCController] Webhook processing failed:', error);
      throw new AppError(400, 'Invalid webhook payload or signature');
    }
  });

  /**
   * Handle issued webhook from Inji
   */
  private static async handleIssuedWebhook(payload: any): Promise<void> {
    const certificate = await Certificate.findOne({ providerVcId: payload.vcId });
    if (certificate && certificate.status !== 'active') {
      certificate.status = 'active';
      certificate.metadata = {
        ...certificate.metadata,
        webhookReceived: {
          status: 'issued',
          timestamp: payload.timestamp,
        },
      };
      await certificate.save();
    }
  }

  /**
   * Handle revoked webhook from Inji
   */
  private static async handleRevokedWebhook(payload: any): Promise<void> {
    const certificate = await Certificate.findOne({ providerVcId: payload.vcId });
    if (certificate && !certificate.revoked) {
      certificate.revoked = true;
      certificate.status = 'revoked';
      certificate.revokedAt = new Date(payload.timestamp);
      certificate.revocationReason = 'provider_revoked';
      certificate.metadata = {
        ...certificate.metadata,
        webhookReceived: {
          status: 'revoked',
          timestamp: payload.timestamp,
        },
      };
      await certificate.save();

      // Create revocation record
      await Revocation.create({
        certificateId: certificate.id,
        providerVcId: certificate.providerVcId,
        vcHash: certificate.vcHash,
        revokedBy: 'system',
        reason: 'provider_revoked',
        metadata: {
          source: 'inji_webhook',
          originalPayload: payload,
        },
      });
    }
  }

  /**
   * Handle expired webhook from Inji
   */
  private static async handleExpiredWebhook(payload: any): Promise<void> {
    const certificate = await Certificate.findOne({ providerVcId: payload.vcId });
    if (certificate) {
      certificate.status = 'expired';
      certificate.metadata = {
        ...certificate.metadata,
        webhookReceived: {
          status: 'expired',
          timestamp: payload.timestamp,
        },
      };
      await certificate.save();
    }
  }

  /**
   * Get VC statistics
   * GET /api/vc/stats
   */
  static getVCStats = asyncHandler(async (_req: Request, res: Response) => {
    const [
      totalCertificates,
      activeCertificates,
      revokedCertificates,
      expiredCertificates,
      pendingJobs,
      failedJobs,
    ] = await Promise.all([
      Certificate.countDocuments(),
      Certificate.countDocuments({ status: 'active', revoked: false }),
      Certificate.countDocuments({ revoked: true }),
      Certificate.countDocuments({ status: 'expired' }),
      IssuanceJob.countDocuments({ status: 'pending' }),
      IssuanceJob.countDocuments({ status: 'failed' }),
    ]);

    res.json({
      success: true,
      data: {
        certificates: {
          total: totalCertificates,
          active: activeCertificates,
          revoked: revokedCertificates,
          expired: expiredCertificates,
        },
        jobs: {
          pending: pendingJobs,
          failed: failedJobs,
        },
      },
    });
  });
}