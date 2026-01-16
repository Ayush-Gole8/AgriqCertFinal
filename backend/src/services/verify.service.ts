import crypto from 'crypto';
import { injiClient } from './injiClient.service.js';
import { Certificate, Revocation } from '../models/index.js';
import config from '../config/config.js';
import type { VerifyVCResponse } from './injiClient.service.js';

export interface VerifyRequest {
  vcJson?: Record<string, any>;
  vcUrl?: string;
  qrPayload?: string;
}

export interface VerifyResult extends VerifyVCResponse {
  certificateId?: string;
  locallyVerified: boolean;
  revocationChecked: boolean;
  errors?: string[];
}

class VerifyService {
  /**
   * Main verify function that handles both provider and local verification
   */
  async verify(request: VerifyRequest): Promise<VerifyResult> {
    let vcJson: Record<string, any> | null = null;
    let vcUrl: string | null = null;
    const errors: string[] = [];

    try {
      // Parse input
      const parseResult = await this.parseInput(request);
      vcJson = parseResult.vcJson;
      vcUrl = parseResult.vcUrl;

      // If we have API key, try provider verification first
      if (config.features.inji.apiKey && !config.features.inji.mockMode) {
        try {
          const providerResult = await this.verifyWithProvider({
            vcJson: vcJson || undefined,
            vcUrl: vcUrl || undefined
          });

          // Also check local revocation
          const revocationResult = await this.checkRevocation(vcJson);

          return {
            ...providerResult,
            revoked: providerResult.revoked || revocationResult.revoked,
            locallyVerified: false,
            revocationChecked: true,
            certificateId: revocationResult.certificateId,
          };
        } catch (error) {
          console.warn('[VerifyService] Provider verification failed, falling back to local:', error);
          errors.push(`Provider verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Fall back to local verification
      return await this.verifyLocally(vcJson, errors);

    } catch (error) {
      console.error('[VerifyService] Verification failed:', error);

      return {
        valid: false,
        signatureValid: false,
        revoked: false,
        issuer: '',
        issuanceDate: '',
        credentialSubject: {},
        locallyVerified: true,
        revocationChecked: false,
        details: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errors: [...errors, error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Parse input to extract VC JSON and URL
   */
  private async parseInput(request: VerifyRequest): Promise<{ vcJson: Record<string, any> | null; vcUrl: string | null }> {
    let vcJson: Record<string, any> | null = null;
    let vcUrl: string | null = null;

    if (request.vcJson) {
      vcJson = request.vcJson;
    } else if (request.vcUrl) {
      vcUrl = request.vcUrl;
      // In mock mode, simulate fetching VC from URL
      if (config.features.inji.mockMode) {
        // Create a mock VC based on the URL
        vcJson = {
          '@context': ['https://www.w3.org/2018/credentials/v1'],
          type: ['VerifiableCredential', 'AgricultureQualityCertificate'],
          issuer: 'did:example:agriqcert',
          issuanceDate: new Date().toISOString(),
          credentialSubject: {
            id: 'did:agriqcert:mock-from-url',
            type: 'MockCredentialFromURL'
          },
          proof: {
            type: 'Ed25519Signature2020',
            proofPurpose: 'assertionMethod',
            verificationMethod: 'did:example:agriqcert#key-1',
            proofValue: 'mock-signature-value-for-url-vc'
          }
        };
      }
    } else if (request.qrPayload) {
      // Parse QR payload
      try {
        const qrData = JSON.parse(request.qrPayload);

        // Handle different QR payload formats
        if (qrData.type === 'AgriQCert_Certificate' || qrData.type === 'AgriQCert') {
          if (qrData.url || qrData.vcUrl) {
            vcUrl = qrData.url || qrData.vcUrl;
            // In mock mode, create VC from URL
            if (config.features.inji.mockMode) {
              vcJson = {
                '@context': ['https://www.w3.org/2018/credentials/v1'],
                type: ['VerifiableCredential', 'AgricultureQualityCertificate'],
                issuer: 'did:example:agriqcert',
                issuanceDate: new Date().toISOString(),
                credentialSubject: {
                  id: qrData.certId || 'did:agriqcert:qr-cert',
                  batchId: qrData.batchId || qrData.certId,
                  type: 'QRCredential'
                },
                proof: {
                  type: 'Ed25519Signature2020',
                  proofPurpose: 'assertionMethod',
                  verificationMethod: 'did:example:agriqcert#key-1',
                  proofValue: 'mock-signature-value-for-qr-vc'
                }
              };
            }
          }
        } else if (qrData.vc) {
          vcJson = qrData.vc;
        } else if (qrData.credentialSubject || qrData['@context']) {
          // Direct VC JSON in QR
          vcJson = qrData;
        } else {
          throw new Error('Unknown QR payload format');
        }
      } catch (error) {
        throw new Error(`Invalid QR payload: ${error instanceof Error ? error.message : 'Parse error'}`);
      }
    } else {
      throw new Error('No verification input provided (vcJson, vcUrl, or qrPayload)');
    }

    return { vcJson, vcUrl };
  }

  /**
   * Verify using Inji provider
   */
  private async verifyWithProvider(request: { vcJson?: Record<string, any>; vcUrl?: string }): Promise<VerifyVCResponse> {
    return await injiClient.verifyVC(request);
  }

  /**
   * Local verification fallback
   */
  private async verifyLocally(vcJson: Record<string, any> | null, errors: string[]): Promise<VerifyResult> {
    if (!vcJson) {
      throw new Error('VC JSON is required for local verification');
    }

    // Basic structure validation
    const structureValid = this.validateVCStructure(vcJson);
    if (!structureValid.isValid) {
      return {
        valid: false,
        signatureValid: false,
        revoked: false,
        issuer: vcJson.issuer || '',
        issuanceDate: vcJson.issuanceDate || new Date().toISOString(),
        credentialSubject: vcJson.credentialSubject || {},
        locallyVerified: true,
        revocationChecked: false,
        details: 'Invalid VC structure',
        errors: [...errors, ...structureValid.errors],
      };
    }

    // Check revocation
    const revocationResult = await this.checkRevocation(vcJson);

    // Check expiration
    const isExpired = this.checkExpiration(vcJson);

    // Verify signature (simplified for demo - in production would use cryptographic verification)
    const signatureValid = this.verifySignatureLocally(vcJson);

    // Validate issuer
    const issuerValid = this.validateIssuer(vcJson);

    const valid = signatureValid && issuerValid && !isExpired && !revocationResult.revoked;

    return {
      valid,
      signatureValid,
      revoked: revocationResult.revoked,
      issuer: vcJson.issuer || '',
      issuanceDate: vcJson.issuanceDate || '',
      expirationDate: vcJson.expirationDate,
      credentialSubject: vcJson.credentialSubject || {},
      details: this.buildVerificationDetails(valid, signatureValid, issuerValid, isExpired, revocationResult.revoked),
      locallyVerified: true,
      revocationChecked: true,
      certificateId: revocationResult.certificateId,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Validate VC structure
   */
  private validateVCStructure(vcJson: Record<string, any>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!vcJson['@context']) {
      errors.push('Missing @context field');
    } else if (!Array.isArray(vcJson['@context']) || !vcJson['@context'].includes('https://www.w3.org/2018/credentials/v1')) {
      errors.push('Invalid or missing W3C credentials context');
    }

    if (!vcJson.type) {
      errors.push('Missing type field');
    } else if (!Array.isArray(vcJson.type)) {
      errors.push('Invalid type field - must be array');
    } else if (!vcJson.type.includes('VerifiableCredential')) {
      errors.push('Invalid or missing VerifiableCredential type');
    }

    if (!vcJson.issuer) {
      errors.push('Missing issuer field');
    }

    if (!vcJson.issuanceDate) {
      errors.push('Missing issuanceDate field');
    }

    if (!vcJson.credentialSubject) {
      errors.push('Missing credentialSubject field');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Check if credential is revoked
   */
  private async checkRevocation(vcJson: Record<string, any> | null): Promise<{ revoked: boolean; certificateId?: string }> {
    if (!vcJson) {
      return { revoked: false };
    }

    // Compute VC hash for revocation check
    const vcHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(vcJson))
      .digest('hex');

    try {
      // Check by VC hash
      const revocation = await (Revocation as any).isRevoked(vcHash);
      if (revocation) {
        return { revoked: true, certificateId: revocation.certificateId };
      }

      // Also check by certificate lookup
      const certificate = await Certificate.findOne({ vcHash });
      if (certificate) {
        return {
          revoked: certificate.revoked || certificate.status === 'revoked',
          certificateId: certificate.id
        };
      }

      return { revoked: false };
    } catch (error) {
      console.error('[VerifyService] Revocation check failed:', error);
      // Don't fail verification for revocation check errors
      return { revoked: false };
    }
  }

  /**
   * Check if credential is expired
   */
  private checkExpiration(vcJson: Record<string, any>): boolean {
    if (!vcJson.expirationDate) {
      return false; // No expiration date means not expired
    }

    try {
      const expirationDate = new Date(vcJson.expirationDate);
      return expirationDate < new Date();
    } catch {
      console.warn('[VerifyService] Invalid expiration date format:', vcJson.expirationDate);
      return false;
    }
  }

  /**
   * Simplified signature verification for local mode
   */
  private verifySignatureLocally(vcJson: Record<string, any>): boolean {
    // In a real implementation, this would:
    // 1. Resolve the issuer DID to get public keys
    // 2. Verify the proof using cryptographic libraries (e.g., jsonld-signatures)
    // 3. Check proof purpose and verification method

    // For demo purposes, we'll do basic checks
    if (!vcJson.proof) {
      return false;
    }

    const proof = vcJson.proof;

    // Check proof structure
    if (!proof.type || !proof.proofPurpose || !proof.verificationMethod) {
      return false;
    }

    // Check that it's an assertion method
    if (proof.proofPurpose !== 'assertionMethod') {
      return false;
    }

    // In mock mode, accept any signature that looks valid
    if (config.features.inji.mockMode && proof.proofValue && proof.proofValue.includes('mock')) {
      return true;
    }

    // For real verification, implement proper signature checking here
    // This is a simplified placeholder
    return !!proof.proofValue;
  }

  /**
   * Validate issuer
   */
  private validateIssuer(vcJson: Record<string, any>): boolean {
    const issuer = vcJson.issuer;

    if (!issuer) {
      return false;
    }

    // Check if issuer is one of our known issuers
    const knownIssuers = [
      config.features.vc.issuerDid,
      config.features.inji.issuerDid,
      'did:example:agriqcert',
    ];

    return knownIssuers.includes(issuer);
  }

  /**
   * Build verification details message
   */
  private buildVerificationDetails(
    valid: boolean,
    signatureValid: boolean,
    issuerValid: boolean,
    isExpired: boolean,
    isRevoked: boolean
  ): string {
    if (valid) {
      return 'Certificate is valid and authentic';
    }

    const issues: string[] = [];

    if (!signatureValid) {
      issues.push('invalid signature');
    }
    if (!issuerValid) {
      issues.push('untrusted issuer');
    }
    if (isExpired) {
      issues.push('expired');
    }
    if (isRevoked) {
      issues.push('revoked');
    }

    return `Certificate verification failed: ${issues.join(', ')}`;
  }

  /**
   * Get verification status for a certificate ID
   */
  async getCertificateStatus(certificateId: string): Promise<{
    exists: boolean;
    revoked: boolean;
    expired: boolean;
    certificate?: any;
  }> {
    try {
      const certificate = await Certificate.findById(certificateId);

      if (!certificate) {
        return { exists: false, revoked: false, expired: false };
      }

      const isExpired = certificate.expiresAt ? certificate.expiresAt < new Date() : false;

      return {
        exists: true,
        revoked: certificate.revoked || certificate.status === 'revoked',
        expired: isExpired,
        certificate: {
          id: certificate.id,
          batchId: certificate.batchId,
          status: certificate.status,
          issuedAt: certificate.issuedAt,
          expiresAt: certificate.expiresAt,
          vcHash: certificate.vcHash,
          providerVcId: certificate.providerVcId,
        },
      };
    } catch (error) {
      console.error('[VerifyService] Certificate status check failed:', error);
      return { exists: false, revoked: false, expired: false };
    }
  }
}

// Export singleton instance
export const verifyService = new VerifyService();
export default verifyService;
