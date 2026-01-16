import { IssuanceJob, Certificate, Revocation, Batch, Inspection, Notification } from '../models/index.js';
import { verifyService } from './verify.service.js';
import type { WebhookPayload } from './injiClient.service.js';
import { AppError } from '../middleware/errorHandler.middleware.js';
import { UserRole } from '../types/index.js';

interface AuthUser {
    userId: string;
    name: string;
    role: UserRole;
}

interface IssueVCInput {
    batchId: string;
    inspectionId?: string;
    user: AuthUser;
}

interface GetJobStatusInput {
    jobId: string;
}

interface GetCertificateInput {
    id: string;
}

interface GetCertificateByBatchInput {
    batchId: string;
}

interface GetFarmerCertificatesInput {
    userId: string;
}

interface VerifyVCInput {
    vcJson?: Record<string, any>;
    vcUrl?: string;
    qrPayload?: string;
}

interface RevokeCertificateInput {
    id: string;
    reason: string;
    user: AuthUser;
    ipAddress?: string;
    userAgent?: string | null;
}

interface HandleWebhookInput {
    payload: WebhookPayload;
}

export class VCService {
    static async issueVC(input: IssueVCInput) {
        const { batchId, inspectionId, user } = input;

        const batch = await Batch.findById(batchId);
        if (!batch) {
            throw new AppError(404, 'Batch not found');
        }

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

        const existingCertificate = await Certificate.findOne({ batchId });
        if (existingCertificate) {
            throw new AppError(409, 'Certificate already exists for this batch');
        }

        const existingJob = await IssuanceJob.findOne({
            batchId,
            status: { $in: ['pending', 'processing'] },
        });

        if (existingJob) {
            return {
                job: existingJob,
                created: false,
            };
        }

        const job = await IssuanceJob.create({
            batchId,
            inspectionId,
            status: 'pending',
            payload: {
                requestedBy: user.userId,
                requestedAt: new Date(),
                batchData: {
                    id: batch.id,
                    productType: batch.productType,
                    productName: batch.productName,
                },
            },
        });

        return {
            job,
            created: true,
        };
    }

    static async getJobStatus(input: GetJobStatusInput) {
        const job = await IssuanceJob.findById(input.jobId);
        if (!job) {
            throw new AppError(404, 'Job not found');
        }
        return job;
    }

    static async getCertificate(input: GetCertificateInput) {
        const certificate = await Certificate.findById(input.id)
            .populate('batchId', 'productType productName quantity unit farmerId farmerName')
            .populate('issuedBy', 'name email role');

        if (!certificate) {
            throw new AppError(404, 'Certificate not found');
        }

        return certificate;
    }

    static async getCertificateByBatch(input: GetCertificateByBatchInput) {
        const certificate = await Certificate.findOne({ batchId: input.batchId })
            .populate('batchId', 'productType productName quantity unit farmerId farmerName')
            .populate('issuedBy', 'name email role');

        if (!certificate) {
            throw new AppError(404, 'Certificate not found for this batch');
        }

        return certificate;
    }

    static async getFarmerCertificates(input: GetFarmerCertificatesInput) {
        const batches = await Batch.find({
            farmerId: input.userId,
        }).select('_id productType productName quantity unit farmerId farmerName status');

        const batchIds = batches.map((batch) => batch.id);

        const certificates = await Certificate.find({
            batchId: { $in: batchIds },
        })
            .populate('batchId', 'productType productName quantity unit farmerId farmerName')
            .populate('issuedBy', 'name email role');

        return certificates;
    }

    static async verifyVC(input: VerifyVCInput) {
        return await verifyService.verify({
            vcJson: input.vcJson,
            vcUrl: input.vcUrl,
            qrPayload: input.qrPayload,
        });
    }

    static async revokeCertificate(input: RevokeCertificateInput) {
        const { id, reason, user, ipAddress, userAgent } = input;

        const certificate = await Certificate.findById(id);
        if (!certificate) {
            throw new AppError(404, 'Certificate not found');
        }

        if (certificate.revoked) {
            throw new AppError(409, 'Certificate is already revoked');
        }

        certificate.revoked = true;
        certificate.status = 'revoked';
        certificate.revokedAt = new Date();
        certificate.revokedBy = user.userId;
        certificate.revocationReason = reason;
        await certificate.save();

        const revocation = await Revocation.create({
            certificateId: certificate.id,
            providerVcId: certificate.providerVcId,
            vcHash: certificate.vcHash,
            revokedBy: user.userId,
            reason,
            metadata: {
                revokedVia: 'api',
                userAgent,
                ipAddress,
            },
        });

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

        return {
            certificate,
            revocation,
        };
    }

    static async handleWebhook(input: HandleWebhookInput) {
        const { payload } = input;

        switch (payload.status) {
            case 'issued':
                await VCService.handleIssuedWebhook(payload);
                break;
            case 'revoked':
                await VCService.handleRevokedWebhook(payload);
                break;
            case 'expired':
                await VCService.handleExpiredWebhook(payload);
                break;
            default:
                console.warn('[VCService] Unknown webhook status:', payload.status);
        }
    }

    private static async handleIssuedWebhook(payload: WebhookPayload): Promise<void> {
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

    private static async handleRevokedWebhook(payload: WebhookPayload): Promise<void> {
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

    private static async handleExpiredWebhook(payload: WebhookPayload): Promise<void> {
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

    static async getVCStats() {
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

        return {
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
        };
    }
}

export default VCService;

