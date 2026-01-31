import { Certificate } from '../models/certificate.model.js';
import { Notification } from '../models/notification.model.js';
import { AuditLog } from '../models/auditLog.model.js';
import { AppError } from '../middleware/errorHandler.middleware.js';

/**
 * Webhook Event Handlers for Inji
 * 
 * Processes webhook events from Inji service:
 * - credential.issued: Credential successfully issued
 * - credential.failed: Credential issuance failed
 * - wallet.credential_received: User received credential in wallet
 * - wallet.credential_viewed: User viewed credential
 * - verification.success: Credential verification succeeded
 * - verification.failed: Credential verification failed
 */

/**
 * Base webhook payload interface
 */
interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Handle credential.issued event
 */
export async function handleCredentialIssued(payload: WebhookPayload): Promise<void> {
  try {
    const { credentialId, vcJson, issuedAt } = payload.data;

    // Find certificate by provider VC ID
    const cert = await Certificate.findOne({ providerVcId: credentialId });
    if (!cert) {
      console.warn(`[WebhookHandler] Certificate not found for credentialId: ${credentialId}`);
      return;
    }

    // Update certificate status
    await Certificate.findByIdAndUpdate(cert.id, {
      status: 'issued',
      vc: vcJson,
      issuedAt: new Date(issuedAt as string | number | Date),
    });

    console.log(`[WebhookHandler] Credential issued: ${credentialId}`);

    // Log event
    await AuditLog.create({
      action: 'webhook.credential_issued',
      resource: 'certificate',
      resourceId: cert.id,
      details: { credentialId },
      timestamp: new Date(),
      severity: 'info',
      success: true,
    });

  } catch (error) {
    console.error('[WebhookHandler] Failed to handle credential.issued:', error);
    throw error;
  }
}

/**
 * Handle credential.failed event
 */
export async function handleCredentialFailed(payload: WebhookPayload): Promise<void> {
  try {
    const { credentialId, error, failedAt } = payload.data;

    const cert = await Certificate.findOne({ providerVcId: credentialId });
    if (!cert) {
      console.warn(`[WebhookHandler] Certificate not found for credentialId: ${credentialId}`);
      return;
    }

    // Update certificate status
    await Certificate.findByIdAndUpdate(cert.id, {
      status: 'failed',
      error: error || 'Issuance failed',
      failedAt: new Date(failedAt as string | number | Date),
    });

    console.error(`[WebhookHandler] Credential issuance failed: ${credentialId}`, error);

    // Create notification for admin/certifier
    await Notification.create({
      type: 'system_alert',
      title: 'Certificate Issuance Failed',
      message: `Certificate ${cert.id} failed to issue: ${error}`,
      severity: 'error',
      metadata: {
        certificateId: cert.id,
        credentialId,
        error,
      },
    });

    // Log event
    await AuditLog.create({
      action: 'webhook.credential_failed',
      resource: 'certificate',
      resourceId: cert.id,
      details: { credentialId, error },
      timestamp: new Date(),
      severity: 'error',
      success: false,
      errorMessage: error,
    });

  } catch (error) {
    console.error('[WebhookHandler] Failed to handle credential.failed:', error);
    throw error;
  }
}

/**
 * Handle wallet.credential_received event
 * Triggered when user successfully receives credential in wallet
 */
export async function handleWalletCredentialReceived(payload: WebhookPayload): Promise<void> {
  try {
    const { credentialId, walletId, receivedAt } = payload.data;

    const cert = await Certificate.findOne({ providerVcId: credentialId });
    if (!cert) {
      console.warn(`[WebhookHandler] Certificate not found for credentialId: ${credentialId}`);
      return;
    }

    // Update wallet metadata
    await Certificate.findByIdAndUpdate(cert.id, {
      'walletMetadata.pushStatus': 'received',
      'walletMetadata.receivedAt': new Date(receivedAt as string | number | Date),
      'walletMetadata.walletUserId': walletId,
    });

    console.log(`[WebhookHandler] Wallet credential received: ${credentialId} by wallet: ${walletId}`);

    // Get farmer info
    const batch = await cert.populate('batchId');
    const farmerId = (batch as unknown as { batchId?: { farmerId: string } }).batchId?.farmerId;

    if (farmerId) {
      // Create success notification
      await Notification.create({
        userId: farmerId,
        type: 'certificate_issued',
        title: '✅ Certificate Added to Wallet',
        message: 'Your certificate has been successfully added to your Inji Wallet.',
        metadata: {
          certificateId: cert.id,
          walletId,
        },
      });
    }

    // Log event
    await AuditLog.create({
      userId: farmerId,
      action: 'webhook.wallet_credential_received',
      resource: 'certificate',
      resourceId: cert.id,
      details: { credentialId, walletId },
      timestamp: new Date(),
      severity: 'info',
      success: true,
    });

  } catch (error) {
    console.error('[WebhookHandler] Failed to handle wallet.credential_received:', error);
    throw error;
  }
}

/**
 * Handle wallet.credential_viewed event
 */
export async function handleWalletCredentialViewed(payload: WebhookPayload): Promise<void> {
  try {
    const { credentialId, walletId, viewedAt } = payload.data;

    const cert = await Certificate.findOne({ providerVcId: credentialId });
    if (!cert) {
      console.warn(`[WebhookHandler] Certificate not found for credentialId: ${credentialId}`);
      return;
    }

    console.log(`[WebhookHandler] Wallet credential viewed: ${credentialId} by wallet: ${walletId}`);

    // Log event (don't update certificate, just track analytics)
    await AuditLog.create({
      action: 'webhook.wallet_credential_viewed',
      resource: 'certificate',
      resourceId: cert.id,
      details: { credentialId, walletId, viewedAt },
      timestamp: new Date(),
      severity: 'info',
      success: true,
    });

  } catch (error) {
    console.error('[WebhookHandler] Failed to handle wallet.credential_viewed:', error);
    throw error;
  }
}

/**
 * Handle verification.success event
 */
export async function handleVerificationSuccess(payload: WebhookPayload): Promise<void> {
  try {
    const { credentialId, verifiedBy, verifiedAt, verificationType } = payload.data;

    const cert = await Certificate.findOne({ providerVcId: credentialId });
    if (!cert) {
      console.warn(`[WebhookHandler] Certificate not found for credentialId: ${credentialId}`);
      return;
    }

    // Increment verification count
    await Certificate.findByIdAndUpdate(cert.id, {
      $inc: { verificationCount: 1 },
      lastVerifiedAt: new Date(verifiedAt as string | number | Date),
    });

    console.log(`[WebhookHandler] Verification success: ${credentialId} by ${verifiedBy}`);

    // Log event
    await AuditLog.create({
      action: 'webhook.verification_success',
      resource: 'certificate',
      resourceId: cert.id,
      details: { credentialId, verifiedBy, verificationType },
      timestamp: new Date(),
      severity: 'info',
      success: true,
    });

  } catch (error) {
    console.error('[WebhookHandler] Failed to handle verification.success:', error);
    throw error;
  }
}

/**
 * Handle verification.failed event
 */
export async function handleVerificationFailed(payload: WebhookPayload): Promise<void> {
  try {
    const { credentialId, error, verifiedBy } = payload.data;
    // Note: verifiedAt exists in payload.data but not used in this function

    const cert = await Certificate.findOne({ providerVcId: credentialId });
    if (!cert) {
      console.warn(`[WebhookHandler] Certificate not found for credentialId: ${credentialId}`);
      return;
    }

    console.warn(`[WebhookHandler] Verification failed: ${credentialId}`, error);

    // Create alert for admin if revoked or tampered
    const errorString = String(error);
    if (errorString.includes('revoked') || errorString.includes('tampered')) {
      await Notification.create({
        type: 'system_alert',
        title: '⚠️ Certificate Verification Failed',
        message: `Certificate ${cert.id} verification failed: ${error}`,
        severity: 'warning',
        metadata: {
          certificateId: cert.id,
          credentialId,
          error,
          verifiedBy,
        },
      });
    }

    // Log event
    await AuditLog.create({
      action: 'webhook.verification_failed',
      resource: 'certificate',
      resourceId: cert.id,
      details: { credentialId, error, verifiedBy },
      timestamp: new Date(),
      severity: 'warning',
      success: false,
      errorMessage: error,
    });

  } catch (error) {
    console.error('[WebhookHandler] Failed to handle verification.failed:', error);
    throw error;
  }
}

/**
 * Handle revocation event
 */
export async function handleRevocation(payload: WebhookPayload): Promise<void> {
  try {
    const { credentialId, revokedAt, reason } = payload.data;

    const cert = await Certificate.findOne({ providerVcId: credentialId });
    if (!cert) {
      console.warn(`[WebhookHandler] Certificate not found for credentialId: ${credentialId}`);
      return;
    }

    // Update certificate status
    await Certificate.findByIdAndUpdate(cert.id, {
      status: 'revoked',
      revokedAt: new Date(revokedAt as string | number | Date),
      revocationReason: reason,
    });

    console.log(`[WebhookHandler] Certificate revoked: ${credentialId}, reason: ${reason}`);

    // Get farmer info
    const batch = await cert.populate('batchId');
    const farmerId = (batch as unknown as { batchId?: { farmerId: string } }).batchId?.farmerId;

    if (farmerId) {
      // Notify farmer
      await Notification.create({
        userId: farmerId,
        type: 'certificate_revoked',
        title: '⚠️ Certificate Revoked',
        message: `Your certificate has been revoked. Reason: ${reason}`,
        severity: 'warning',
        metadata: {
          certificateId: cert.id,
          reason,
        },
      });
    }

    // Log event
    await AuditLog.create({
      action: 'webhook.revocation',
      resource: 'certificate',
      resourceId: cert.id,
      details: { credentialId, reason },
      timestamp: new Date(),
      severity: 'warning',
      success: true,
    });

  } catch (error) {
    console.error('[WebhookHandler] Failed to handle revocation:', error);
    throw error;
  }
}

/**
 * Route webhook events to appropriate handlers
 * @param eventType - Webhook event type
 * @param payload - Webhook payload
 */
export async function routeWebhookEvent(eventType: string, payload: WebhookPayload): Promise<void> {
  const handlers: Record<string, (payload: WebhookPayload) => Promise<void>> = {
    'credential.issued': handleCredentialIssued,
    'credential.failed': handleCredentialFailed,
    'wallet.credential_received': handleWalletCredentialReceived,
    'wallet.credential_viewed': handleWalletCredentialViewed,
    'verification.success': handleVerificationSuccess,
    'verification.failed': handleVerificationFailed,
    'credential.revoked': handleRevocation,
  };

  const handler = handlers[eventType];
  
  if (!handler) {
    console.warn(`[WebhookHandler] Unknown event type: ${eventType}`);
    throw new AppError(400, `Unknown webhook event type: ${eventType}`);
  }

  await handler(payload);
}
