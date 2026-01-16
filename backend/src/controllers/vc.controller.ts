import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { AppError } from '../middleware/errorHandler.middleware.js';
import { injiClient } from '../services/injiClient.service.js';
import { VCService } from '../services/vc.service.js';

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

    const { job, created } = await VCService.issueVC({
      batchId,
      inspectionId,
      user: req.user,
    });

    if (!created) {
      res.status(202).json({
        success: true,
        message: 'Issuance job already queued',
        data: {
          jobId: job.id,
          status: job.status,
          createdAt: job.createdAt,
        },
      });
      return;
    }

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

    const job = await VCService.getJobStatus({ jobId });

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

    const certificate = await VCService.getCertificate({ id });

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

    const certificate = await VCService.getCertificateByBatch({ batchId });

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
   * Get certificates for the authenticated farmer
   * GET /api/farmer/certificates
   */
  static getFarmerCertificates = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const certificates = await VCService.getFarmerCertificates({
      userId: req.user.userId,
    });

    res.json({
      success: true,
      data: {
        certificates: certificates.map((certificate) => ({
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
        })),
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

    const result = await VCService.verifyVC({ vcJson, vcUrl, qrPayload });

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

    const { certificate, revocation } = await VCService.revokeCertificate({
      id,
      reason,
      user: req.user,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });

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

      await VCService.handleWebhook({ payload });

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
   * Get VC statistics
   * GET /api/vc/stats
   */
  static getVCStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await VCService.getVCStats();

    res.json({
      success: true,
      data: {
        certificates: {
          total: stats.certificates.total,
          active: stats.certificates.active,
          revoked: stats.certificates.revoked,
          expired: stats.certificates.expired,
        },
        jobs: {
          pending: stats.jobs.pending,
          failed: stats.jobs.failed,
        },
      },
    });
  });
}
