import crypto from 'crypto';
import config from '../config/config.js';

/**
 * Webhook Signature Verification Utility
 * Implements HMAC-SHA256 signature validation for Inji webhooks
 * 
 * Security features:
 * - HMAC-SHA256 signature verification
 * - Replay attack prevention via timestamp validation
 * - Timing-safe comparison to prevent timing attacks
 * - Multiple signature format support
 */
export class WebhookCryptoUtil {
  private secret: string;
  private algorithm: string;
  private tolerance: number;

  constructor() {
    this.secret = config.features.inji.webhookSecret || '';
    this.algorithm = config.features.inji.webhookSignatureAlgorithm;
    this.tolerance = config.features.inji.webhookToleranceSeconds;

    if (!this.secret && config.features.inji.webhookEnabled) {
      console.warn('INJI_WEBHOOK_SECRET not configured - webhook signature verification disabled');
    }
  }

  /**
   * Verify webhook signature
   * @param payload - Raw request body (string)
   * @param signature - Signature from header (e.g., 'sha256=abc123...')
   * @param timestamp - Timestamp from header (Unix timestamp or ISO string)
   * @returns boolean - true if valid, false otherwise
   */
  verifySignature(payload: string, signature: string, timestamp: string): boolean {
    try {
      // 1. Validate inputs
      if (!payload || !signature || !timestamp) {
        console.error('[WebhookCrypto] Missing required parameters');
        return false;
      }

      if (!this.secret) {
        console.error('[WebhookCrypto] Webhook secret not configured');
        return false;
      }

      // 2. Check timestamp to prevent replay attacks
      const timestampValid = this.validateTimestamp(timestamp);
      if (!timestampValid) {
        console.error('[WebhookCrypto] Timestamp validation failed - possible replay attack');
        return false;
      }

      // 3. Parse signature header
      const parsedSignature = this.parseSignatureHeader(signature);
      if (!parsedSignature) {
        console.error('[WebhookCrypto] Invalid signature format');
        return false;
      }

      // 4. Reconstruct signed payload: timestamp + '.' + payload
      const signedPayload = `${timestamp}.${payload}`;

      // 5. Compute HMAC-SHA256
      const expectedHash = this.computeHMAC(signedPayload, parsedSignature.algorithm);

      // 6. Compare using timing-safe comparison
      const isValid = this.timingSafeEqual(expectedHash, parsedSignature.hash);

      if (!isValid) {
        console.error('[WebhookCrypto] Signature mismatch');
      }

      return isValid;

    } catch (error) {
      console.error('[WebhookCrypto] Signature verification error:', error);
      return false;
    }
  }

  /**
   * Generate signature for testing
   * @param payload - Payload to sign
   * @param timestamp - Timestamp (Unix timestamp or ISO string)
   * @returns Signature in format "sha256=abc123..."
   */
  generateSignature(payload: string, timestamp: string): string {
    const signedPayload = `${timestamp}.${payload}`;
    const hash = this.computeHMAC(signedPayload, this.algorithm);
    return `${this.algorithm}=${hash}`;
  }

  /**
   * Validate timestamp to prevent replay attacks
   * @param timestamp - Unix timestamp (seconds) or ISO string
   * @returns boolean - true if within tolerance window
   */
  private validateTimestamp(timestamp: string): boolean {
    try {
      // Convert to Unix timestamp (seconds)
      let ts: number;
      
      // Check if it's a Unix timestamp (numeric string)
      if (/^\d+$/.test(timestamp)) {
        ts = parseInt(timestamp, 10);
      } else {
        // Try parsing as ISO date
        ts = Math.floor(new Date(timestamp).getTime() / 1000);
      }

      if (isNaN(ts)) {
        console.error('[WebhookCrypto] Invalid timestamp format:', timestamp);
        return false;
      }

      const now = Math.floor(Date.now() / 1000);
      const diff = Math.abs(now - ts);

      if (diff > this.tolerance) {
        console.error(`[WebhookCrypto] Timestamp outside tolerance window: ${diff}s > ${this.tolerance}s`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[WebhookCrypto] Timestamp validation error:', error);
      return false;
    }
  }

  /**
   * Parse signature header (format: "sha256=abc123..." or multiple "sha256=...,sha512=...")
   * @param header - Signature header value
   * @returns Parsed signature or null if invalid
   */
  private parseSignatureHeader(header: string): { algorithm: string; hash: string } | null {
    try {
      if (!header) return null;

      // Handle multiple signatures (versioned signatures)
      const signatures = header.split(',');
      
      for (const sig of signatures) {
        const match = sig.trim().match(/^([a-z0-9]+)=([a-f0-9]+)$/);
        if (match) {
          const [, algorithm, hash] = match;
          
          // Prefer the configured algorithm, but accept others
          if (algorithm === this.algorithm || signatures.length === 1) {
            return { algorithm, hash };
          }
        }
      }

      console.error('[WebhookCrypto] No valid signature found in header:', header);
      return null;
    } catch (error) {
      console.error('[WebhookCrypto] Signature parsing error:', error);
      return null;
    }
  }

  /**
   * Compute HMAC signature
   * @param payload - Payload to sign
   * @param algorithm - Hash algorithm (sha256, sha512, etc.)
   * @returns Hex-encoded HMAC
   */
  private computeHMAC(payload: string, algorithm: string): string {
    const hmac = crypto.createHmac(algorithm, this.secret);
    hmac.update(payload, 'utf8');
    return hmac.digest('hex');
  }

  /**
   * Timing-safe string comparison
   * Prevents timing attacks by comparing in constant time
   * @param a - First string (hex hash)
   * @param b - Second string (hex hash)
   * @returns boolean - true if equal
   */
  private timingSafeEqual(a: string, b: string): boolean {
    try {
      if (typeof a !== 'string' || typeof b !== 'string') {
        return false;
      }

      // Convert hex strings to buffers
      const bufA = Buffer.from(a, 'hex');
      const bufB = Buffer.from(b, 'hex');

      // Length must match
      if (bufA.length !== bufB.length) {
        return false;
      }

      // Use crypto.timingSafeEqual for constant-time comparison
      return crypto.timingSafeEqual(bufA, bufB);
    } catch (error) {
      console.error('[WebhookCrypto] Timing-safe comparison error:', error);
      return false;
    }
  }

  /**
   * Get current Unix timestamp (for testing)
   */
  static getCurrentTimestamp(): string {
    return Math.floor(Date.now() / 1000).toString();
  }

  /**
   * Validate webhook secret strength
   * @returns boolean - true if secret meets security requirements
   */
  static validateSecretStrength(secret: string): boolean {
    // Minimum 32 characters for production
    if (!secret || secret.length < 32) {
      console.warn('[WebhookCrypto] Webhook secret should be at least 32 characters');
      return false;
    }
    return true;
  }
}

// Export singleton instance
export const webhookCrypto = new WebhookCryptoUtil();
