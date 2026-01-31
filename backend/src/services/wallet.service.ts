import { Certificate } from '../models/certificate.model.js';
import { User } from '../models/user.model.js';
import { Notification } from '../models/notification.model.js';
import { AuditLog } from '../models/auditLog.model.js';
import { injiClient } from './injiClient.service.js';
import config from '../config/config.js';
import { AppError } from '../middleware/errorHandler.middleware.js';

/**
 * Wallet Push Result Interface
 */
interface WalletPushResult {
  success: boolean;
  reason?: string;
  deeplink?: string;
  error?: string;
}

/**
 * Inji Wallet Push Service
 * Handles credential push to user's mobile wallet
 * 
 * Features:
 * - Push credentials to Inji Wallet app
 * - Generate deeplink fallback
 * - Handle push failures gracefully
 * - Track push status and attempts
 */
export class WalletService {
  constructor() {
  }

  /**
   * Push credential to user's wallet
   * @param certificateId - Certificate ID
   * @param userId - User ID (farmer)
   * @returns WalletPushResult
   */
  async pushToWallet(certificateId: string, userId: string): Promise<WalletPushResult> {
    try {
      // Check if wallet push is enabled
      if (!config.features.inji.walletPushEnabled) {
        console.log('[WalletService] Wallet push disabled in configuration');
        return {
          success: false,
          reason: 'wallet_push_disabled',
        };
      }

      // 1. Get certificate with VC data
      const cert = await Certificate.findById(certificateId).populate('batchId');
      if (!cert) {
        throw new AppError(404, 'Certificate not found');
      }

      if (!cert.vc) {
        throw new AppError(400, 'Certificate not issued - VC data missing');
      }

      // 2. Get user wallet info
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError(404, 'User not found');
      }

      // Check if user has linked wallet
      const walletId = (user as unknown as { walletId?: string }).walletId; // Assuming walletId field exists or will be added
      if (!walletId) {
        // User hasn't linked wallet yet - generate deeplink
        const deeplink = await this.generateDeeplink(certificateId, cert);
        
        await this.createWalletNotification(
          userId,
          certificateId,
          deeplink,
          'not_linked'
        );

        // Update certificate with deeplink
        await Certificate.findByIdAndUpdate(certificateId, {
          'walletMetadata.pushStatus': 'failed',
          'walletMetadata.pushAttempts': (cert.walletMetadata?.pushAttempts || 0) + 1,
          'walletMetadata.lastPushAttempt': new Date(),
          'walletMetadata.walletDeeplink': deeplink,
          'walletMetadata.pushError': 'Wallet not linked',
        });

        return {
          success: false,
          reason: 'wallet_not_linked',
          deeplink,
        };
      }

      // 3. Call Inji Wallet Push API
      try {
        await injiClient.pushToWallet({
          walletId,
          vcJson: cert.vc as unknown as Record<string, unknown>,
        });

        // Generate deeplink as fallback
        const deeplink = await this.generateDeeplink(certificateId, cert);

        // 4. Update certificate with success status
        await Certificate.findByIdAndUpdate(certificateId, {
          'walletMetadata.pushStatus': 'sent',
          'walletMetadata.pushAttempts': (cert.walletMetadata?.pushAttempts || 0) + 1,
          'walletMetadata.lastPushAttempt': new Date(),
          'walletMetadata.walletDeeplink': deeplink,
          'walletMetadata.walletUserId': walletId,
          'walletMetadata.pushError': null,
        });

        // 5. Create notification
        await this.createWalletNotification(
          userId,
          certificateId,
          deeplink,
          'sent'
        );

        // 6. Log success
        await this.logPushSuccess(userId, certificateId, walletId);

        return {
          success: true,
          deeplink,
        };

      } catch (pushError: unknown) {
        // Handle push error but still provide deeplink
        console.error('[WalletService] Wallet push API failed:', pushError);
        
        const deeplink = await this.generateDeeplink(certificateId, cert);
        
        await this.handlePushError(certificateId, pushError, deeplink);
        
        return {
          success: false,
          reason: 'push_failed',
          deeplink,
          error: (pushError as Error).message,
        };
      }

    } catch (error: unknown) {
      console.error('[WalletService] Push to wallet failed:', error);
      throw error;
    }
  }

  /**
   * Generate wallet deeplink (fallback if push fails)
   * @param certificateId - Certificate ID
   * @param _cert - Certificate document
   * @returns Deeplink URL
   */
  async generateDeeplink(certificateId: string, _cert: unknown): Promise<string> {
    try {
      const scheme = config.features.inji.walletDeeplinkScheme;
      
      // Create deeplink with certificate data
      // Format: inji://credential/import?id=CERT-123&url=https://api.agriqcert.com/api/vc/CERT-123
      const apiUrl = `${config.features.qr.baseUrl}/api/vc/${certificateId}`;
      
      const deeplink = `${scheme}credential/import?id=${certificateId}&url=${encodeURIComponent(apiUrl)}`;
      
      return deeplink;
    } catch (error) {
      console.error('[WalletService] Deeplink generation failed:', error);
      // Fallback to web URL
      return `${config.features.qr.baseUrl}/verify?id=${certificateId}`;
    }
  }

  /**
   * Handle wallet push errors
   * @param certificateId - Certificate ID
   * @param error - Error object
   * @param deeplink - Fallback deeplink
   */
  private async handlePushError(
    certificateId: string,
    error: unknown,
    deeplink: string
  ): Promise<void> {
    try {
      const cert = await Certificate.findById(certificateId);
      if (!cert) return;

      await Certificate.findByIdAndUpdate(certificateId, {
        'walletMetadata.pushStatus': 'failed',
        'walletMetadata.pushAttempts': (cert.walletMetadata?.pushAttempts || 0) + 1,
        'walletMetadata.lastPushAttempt': new Date(),
        'walletMetadata.walletDeeplink': deeplink,
        'walletMetadata.pushError': (error as Error).message || 'Unknown error',
      });

      // Create notification with deeplink
      const batch = await cert.populate('batchId');
      const farmerId = (batch as unknown as { batchId?: { farmerId?: string } }).batchId?.farmerId;
      
      if (farmerId) {
        await this.createWalletNotification(
          farmerId,
          certificateId,
          deeplink,
          'failed'
        );
      }

      // Log error
      await AuditLog.create({
        action: 'wallet.push_failed',
        resource: 'certificate',
        resourceId: certificateId,
        details: {
          error: (error as Error).message,
          deeplink,
        },
        timestamp: new Date(),
        severity: 'warning',
        success: false,
        errorMessage: (error as Error).message,
      });

    } catch (logError) {
      console.error('[WalletService] Failed to handle push error:', logError);
    }
  }

  /**
   * Create in-app notification with wallet deeplink
   * @param userId - User ID
   * @param certId - Certificate ID
   * @param deeplink - Wallet deeplink
   * @param status - Push status
   */
  private async createWalletNotification(
    userId: string,
    certId: string,
    deeplink: string,
    status: 'sent' | 'failed' | 'not_linked'
  ): Promise<void> {
    try {
      let title: string;
      let message: string;

      switch (status) {
        case 'sent':
          title = '📱 Certificate Added to Wallet';
          message = 'Your certificate has been pushed to your Inji Wallet app.';
          break;
        case 'failed':
          title = '📱 Add Certificate to Wallet';
          message = 'Tap the button below to add your certificate to Inji Wallet.';
          break;
        case 'not_linked':
          title = '📱 Link Your Wallet';
          message = 'Link your Inji Wallet to automatically receive certificates.';
          break;
      }

      await Notification.create({
        userId,
        type: 'certificate_issued',
        title,
        message,
        actionUrl: deeplink,
        metadata: {
          certificateId: certId,
          deeplink,
          walletPushStatus: status,
        },
      });
    } catch (error) {
      console.error('[WalletService] Failed to create notification:', error);
    }
  }

  /**
   * Log successful wallet push
   */
  private async logPushSuccess(
    userId: string,
    certificateId: string,
    walletId: string
  ): Promise<void> {
    try {
      await AuditLog.create({
        userId,
        action: 'wallet.push_success',
        resource: 'certificate',
        resourceId: certificateId,
        details: {
          walletId,
        },
        timestamp: new Date(),
        severity: 'info',
        success: true,
      });
    } catch (error) {
      console.error('[WalletService] Failed to log push success:', error);
    }
  }

  /**
   * Retry failed wallet pushes
   * @param maxAttempts - Maximum retry attempts
   */
  async retryFailedPushes(maxAttempts: number = 3): Promise<void> {
    try {
      // Find certificates with failed pushes that haven't exceeded max attempts
      const failedCerts = await Certificate.find({
        'walletMetadata.pushStatus': 'failed',
        'walletMetadata.pushAttempts': { $lt: maxAttempts },
      }).populate('batchId');

      console.log(`[WalletService] Retrying ${failedCerts.length} failed wallet pushes`);

      for (const cert of failedCerts) {
        const batch = (cert as unknown as { batchId?: { farmerId?: string } }).batchId;
        if (batch?.farmerId) {
          try {
            await this.pushToWallet(cert.id, batch.farmerId);
          } catch (error) {
            console.error(`[WalletService] Retry failed for cert ${cert.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('[WalletService] Retry failed pushes error:', error);
    }
  }
}

// Export singleton instance
export const walletService = new WalletService();
