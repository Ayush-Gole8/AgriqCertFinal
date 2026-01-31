import { IssuanceJob, Certificate, Revocation, Batch, Inspection, Notification } from '../models/index.js';
import { verifyService } from './verify.service.js';
import { AppError } from '../middleware/errorHandler.middleware.js';
import { UserRole } from '../types/index.js';
import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import crypto from 'crypto';
import QRCode from 'qrcode';

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


export class VCService {
    /**
     * Generate a self-signed W3C Verifiable Credential
     */
    private static generateInternalVC(
        batch: any,
        inspection: any | null,
        issuerId: string
    ): { vc: any; vcHash: string } {
        const issuanceDate = new Date().toISOString();
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + config.features.vc.defaultExpiryDays);
        const expirationDateISO = expirationDate.toISOString();

        // Build credential subject with batch and inspection data
        const credentialSubject: any = {
            id: `did:agriqcert:batch:${batch.id}`,
            batchId: batch.id.toString(),
            productName: batch.productName,
            productType: batch.productType,
            quantity: batch.quantity,
            unit: batch.unit,
            harvestDate: batch.harvestDate.toISOString(),
            farmerName: batch.farmerName,
            location: {
                address: batch.location.address,
                region: batch.location.region,
                country: batch.location.country || '',
            },
        };

        // Add inspection readings if available
        if (inspection && inspection.readings && inspection.readings.length > 0) {
            credentialSubject.qualityReadings = inspection.readings.map((reading: any) => ({
                parameter: reading.parameter,
                value: reading.value,
                unit: reading.unit,
                passed: reading.passed,
            }));

            // Add quality reading summary if available
            if (inspection.qualityReadings) {
                credentialSubject.qualitySummary = {
                    moisturePercent: inspection.qualityReadings.moisturePercent,
                    pesticidePPM: inspection.qualityReadings.pesticidePPM,
                    temperatureC: inspection.qualityReadings.temperatureC,
                    isOrganic: inspection.qualityReadings.isOrganic,
                };
            }
        }

        // Build the VC object (without proof first for signing)
        const vcWithoutProof = {
            '@context': ['https://www.w3.org/2018/credentials/v1'],
            type: ['VerifiableCredential', 'AgricultureQualityCertificate'],
            issuer: config.features.vc.issuerDid,
            issuanceDate,
            expirationDate: expirationDateISO,
            credentialSubject,
        };

        // Sign the VC using JWT_SECRET
        const vcString = JSON.stringify(vcWithoutProof);
        const signature = jwt.sign(
            { vc: vcString },
            config.jwt.secret!,
            {
                expiresIn: `${config.features.vc.defaultExpiryDays}d`,
                issuer: 'agriqcert-api',
                audience: 'agriqcert-vc',
            }
        );

        // Compute VC hash for revocation tracking
        const vcHash = crypto
            .createHash('sha256')
            .update(vcString)
            .digest('hex');

        // Add proof to VC
        const vc = {
            ...vcWithoutProof,
            proof: {
                type: 'JwtProof2020',
                created: issuanceDate,
                verificationMethod: `${config.features.vc.issuerDid}#key-1`,
                proofPurpose: 'assertionMethod',
                jws: signature,
            },
        };

        return { vc, vcHash };
    }

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

        // Generate the VC synchronously
        const { vc, vcHash } = this.generateInternalVC(batch, inspection, user.userId);

        // QR code data will be set after certificate creation

        // Create certificate directly (synchronously)
        const certificate = await Certificate.create({
            batchId: batch.id,
            vc,
            vcHash,
            qrCodeData: '', // Will be updated after creation
            status: 'active',
            revoked: false,
            issuedBy: user.userId,
            issuedAt: new Date(),
            expiresAt: new Date(vc.expirationDate),
        });

        // Update QR code data with actual certificate ID
        // Use window.location.origin format for frontend URL
        const baseUrl = process.env.FRONTEND_URL || config.features.qr.baseUrl || 'http://localhost:5173';
        const verifyUrl = `${baseUrl}/verify/${certificate.id}`;
        const updatedQrCodeData = JSON.stringify({
            type: 'AgriQCert',
            certId: certificate.id,
            verifyUrl,
        });

        // Generate QR code image
        let qrCodeImage: string | undefined;
        try {
            qrCodeImage = await QRCode.toDataURL(updatedQrCodeData, {
                errorCorrectionLevel: 'M',
                type: 'image/png',
                width: 300,
            });
        } catch (error) {
            console.error('[VCService] Failed to generate QR code image:', error);
        }

        // Update certificate with QR code data
        certificate.qrCodeData = updatedQrCodeData;
        if (qrCodeImage) {
            certificate.qrCodeImage = qrCodeImage;
        }
        await certificate.save();

        // Update batch status
        batch.status = 'certified';
        batch.certifiedAt = new Date();
        await batch.save();

        // Create notification for farmer
        await Notification.create({
            userId: batch.farmerId,
            type: 'certificate_issued',
            title: 'Certificate Issued',
            message: `Your certificate for batch ${batch.id} (${batch.productName}) has been issued successfully.`,
            data: {
                certificateId: certificate.id,
                batchId: batch.id,
            },
            priority: 'high',
        });

        return {
            certificate,
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

    /**
     * Verify a certificate's signature internally
     */
    static async verifyCertificateSignature(certificate: any): Promise<boolean> {
        try {
            if (!certificate.vc || !certificate.vc.proof || !certificate.vc.proof.jws) {
                return false;
            }

            const proof = certificate.vc.proof;
            const vcWithoutProof = { ...certificate.vc };
            delete vcWithoutProof.proof;

            // Verify JWT signature
            const decoded = jwt.verify(proof.jws, config.jwt.secret!, {
                issuer: 'agriqcert-api',
                audience: 'agriqcert-vc',
            });

            // Verify the payload matches the VC
            const vcString = JSON.stringify(vcWithoutProof);
            if ((decoded as any).vc !== vcString) {
                return false;
            }

            return true;
        } catch (error) {
            console.error('[VCService] Signature verification failed:', error);
            return false;
        }
    }

    /**
     * Get public verification data (Farm-to-Table summary)
     */
    static async getPublicVerificationData(certificateId: string) {
        const certificate = await Certificate.findById(certificateId)
            .populate('batchId', 'productType productName quantity unit farmerId farmerName location harvestDate')
            .populate('issuedBy', 'name email role');

        if (!certificate) {
            throw new AppError(404, 'Certificate not found');
        }

        // Verify signature
        const signatureValid = await this.verifyCertificateSignature(certificate);

        // Check revocation
        const isRevoked = certificate.revoked || certificate.status === 'revoked';

        // Check expiration
        const isExpired = certificate.expiresAt ? certificate.expiresAt < new Date() : false;

        // Get inspection data if available
        let inspection = null;
        if (certificate.batchId) {
            inspection = await Inspection.findOne({ batchId: certificate.batchId })
                .select('readings qualityReadings overallResult completedAt')
                .sort({ createdAt: -1 })
                .limit(1);
        }

        // Build Farm-to-Table summary
        const batch = certificate.batchId as any;
        const summary = {
            certificate: {
                id: certificate.id,
                status: certificate.status,
                issuedAt: certificate.issuedAt,
                expiresAt: certificate.expiresAt,
                issuer: certificate.issuedBy ? (certificate.issuedBy as any).name : 'AgriQCert',
            },
            product: {
                name: batch?.productName || 'Unknown',
                type: batch?.productType || 'Unknown',
                quantity: batch?.quantity || 0,
                unit: batch?.unit || 'kg',
            },
            origin: {
                farmer: batch?.farmerName || 'Unknown',
                location: batch?.location ? {
                    address: batch.location.address,
                    region: batch.location.region,
                    country: batch.location.country || '',
                } : null,
                harvestDate: batch?.harvestDate || null,
            },
            quality: inspection ? {
                overallResult: inspection.overallResult,
                readings: inspection.readings || [],
                qualityReadings: inspection.qualityReadings || null,
                inspectedAt: inspection.completedAt || null,
            } : null,
            verification: {
                valid: signatureValid && !isRevoked && !isExpired,
                signatureValid,
                revoked: isRevoked,
                expired: isExpired,
                verifiedAt: new Date().toISOString(),
            },
        };

        return summary;
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

