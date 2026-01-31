import { Request, Response, NextFunction } from 'express';
import { WebhookCryptoUtil } from '../utils/webhook.crypto.util.js';
import { WebhookLog } from '../models/webhookLog.model.js';
import { AuditLog } from '../models/auditLog.model.js';
import config from '../config/config.js';

/**
 * Webhook Authentication Middleware
 * Verifies Inji webhook signatures before processing
 * 
 * Features:
 * - HMAC signature verification
 * - Replay attack prevention
 * - Duplicate detection (idempotency)
 * - Comprehensive audit logging
 * - Rate limiting support
 */
export class WebhookMiddleware {
  private cryptoUtil: WebhookCryptoUtil;

  constructor() {
    this.cryptoUtil = new WebhookCryptoUtil();
  }

  /**
   * Verify Inji webhook signature
   */
  verifyInjiSignature = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      // Check if webhook verification is enabled
      if (!config.features.inji.webhookEnabled) {
        console.warn('[WebhookMiddleware] Webhook verification disabled');
        return next();
      }

      // 1. Extract headers
      const signature = req.headers['x-inji-signature'] as string;
      const timestamp = req.headers['x-inji-timestamp'] as string;
      const webhookId = req.headers['x-inji-webhook-id'] as string;
      const eventType = req.headers['x-inji-event-type'] as string;

      // 2. Check required headers
      if (!signature || !timestamp) {
        await this.logFailure(req, 'Missing signature headers', {
          hasSignature: !!signature,
          hasTimestamp: !!timestamp,
          hasWebhookId: !!webhookId,
        });
        
        return res.status(401).json({
          success: false,
          error: 'Missing required webhook headers',
          code: 'MISSING_HEADERS',
        });
      }

      if (!webhookId) {
        console.warn('[WebhookMiddleware] Missing webhook ID header');
      }

      // 3. Get raw body (must use raw body parser)
      const rawBody = (req as Request & { rawBody?: string }).rawBody || JSON.stringify(req.body);

      if (!rawBody) {
        await this.logFailure(req, 'Missing request body');
        return res.status(400).json({
          success: false,
          error: 'Missing request body',
          code: 'MISSING_BODY',
        });
      }

      // 4. Check for duplicate webhooks (idempotency)
      if (webhookId) {
        const isDuplicate = await this.checkDuplicate(webhookId);
        if (isDuplicate) {
          console.log(`[WebhookMiddleware] Duplicate webhook detected: ${webhookId}`);
          
          // Return 200 but don't process (Inji expects 200 for idempotent calls)
          return res.status(200).json({
            success: true,
            message: 'Webhook already processed',
            duplicate: true,
          });
        }
      }

      // 5. Verify signature
      const isValid = this.cryptoUtil.verifySignature(rawBody, signature, timestamp);

      if (!isValid) {
        await this.logFailure(req, 'Invalid signature', {
          webhookId,
          signatureLength: signature?.length,
          timestampValue: timestamp,
        });

        return res.status(401).json({
          success: false,
          error: 'Invalid webhook signature',
          code: 'INVALID_SIGNATURE',
        });
      }

      // 6. Create webhook log entry (will be updated after processing)
      if (webhookId) {
        try {
          await WebhookLog.create({
            webhookId,
            eventType: eventType || 'unknown',
            payload: req.body,
            signature,
            timestamp: new Date(parseInt(timestamp) * 1000 || timestamp),
            processed: false,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          });
        } catch (error: unknown) {
          // Duplicate key error is OK (race condition)
          if ((error as { code?: number }).code !== 11000) {
            console.error('[WebhookMiddleware] Failed to create webhook log:', error);
          }
        }
      }

      // 7. Log success and continue
      await this.logSuccess(req, webhookId, Date.now() - startTime);
      
      // Attach webhook metadata to request
      (req as Request & { webhookMeta?: Record<string, unknown> }).webhookMeta = {
        webhookId,
        eventType,
        timestamp,
        verifiedAt: new Date(),
      };

      next();

    } catch (error: unknown) {
      console.error('[WebhookMiddleware] Verification error:', error);
      
      await this.logFailure(req, 'Verification error', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });

      return res.status(500).json({
        success: false,
        error: 'Webhook verification failed',
        code: 'VERIFICATION_ERROR',
      });
    }
  };

  /**
   * Check if webhook was already processed (prevent duplicates)
   * @param webhookId - Webhook ID from header
   * @returns boolean - true if duplicate
   */
  private async checkDuplicate(webhookId: string): Promise<boolean> {
    try {
      const existing = await WebhookLog.findOne({ webhookId });
      return !!existing;
    } catch (error) {
      console.error('[WebhookMiddleware] Duplicate check error:', error);
      return false; // Fail open to allow processing
    }
  }

  /**
   * Log successful webhook verification
   */
  private async logSuccess(
    req: Request,
    webhookId: string | undefined,
    duration: number
  ): Promise<void> {
    try {
      await AuditLog.create({
        action: 'webhook.verified',
        resource: 'webhook',
        resourceId: webhookId || 'unknown',
        details: {
          eventType: req.headers['x-inji-event-type'],
          duration,
          success: true,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string,
        timestamp: new Date(),
        severity: 'info',
        success: true,
      });
    } catch (error) {
      console.error('[WebhookMiddleware] Failed to log success:', error);
    }
  }

  /**
   * Log failed webhook verification
   */
  private async logFailure(
    req: Request,
    reason: string,
    meta?: Record<string, unknown>
  ): Promise<void> {
    try {
      await AuditLog.create({
        action: 'webhook.verification_failed',
        resource: 'webhook',
        resourceId: (req.headers['x-inji-webhook-id'] as string) || 'unknown',
        details: {
          reason,
          eventType: req.headers['x-inji-event-type'],
          meta,
          headers: {
            signature: req.headers['x-inji-signature'] ? '[REDACTED]' : undefined,
            timestamp: req.headers['x-inji-timestamp'],
          },
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string,
        timestamp: new Date(),
        severity: 'warning',
        success: false,
        errorMessage: reason,
      });
    } catch (error) {
      console.error('[WebhookMiddleware] Failed to log failure:', error);
    }
  }

  /**
   * Rate limiting for webhooks (optional additional layer)
   */
  rateLimitWebhooks = async (
    _req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    // This is a placeholder - implement proper rate limiting in production
    // Consider using express-rate-limit with Redis store
    
    next();
  };
}

// Export singleton instance
export const webhookMiddleware = new WebhookMiddleware();

// Export individual middleware functions
export const verifyInjiSignature = webhookMiddleware.verifyInjiSignature;
export const rateLimitWebhooks = webhookMiddleware.rateLimitWebhooks;
