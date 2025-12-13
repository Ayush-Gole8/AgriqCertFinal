import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { injiClient } from './injiClient.js';
import config from '../config/index.js';

// Mock config for testing
vi.mock('../config/index.js', () => ({
  default: {
    inji: {
      apiUrl: 'https://api.inji.example',
      clientId: 'test_client',
      clientSecret: 'test_secret',
      issuerId: 'test_issuer',
      mockMode: true,
      mockDelay: 100,
    }
  }
}));

describe('InjiClient', () => {
  beforeAll(() => {
    // Ensure we're in mock mode for tests
    process.env.INJI_MOCK_MODE = 'true';
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('issueVC', () => {
    it('should issue a VC in mock mode', async () => {
      const payload = {
        credentialSubject: {
          id: 'did:example:farmer123',
          batchId: 'BATCH-2024-001',
          productType: 'Organic Rice',
          quantity: 1000,
          unit: 'kg'
        },
        issuer: 'did:example:agriqcert',
        type: ['VerifiableCredential', 'AgriQualityCertificate']
      };

      const result = await injiClient.issueVC(payload);

      expect(result).toHaveProperty('vcId');
      expect(result).toHaveProperty('vcUrl');
      expect(result).toHaveProperty('vcJson');
      expect(result.vcId).toMatch(/^vc_/);
      expect(result.vcUrl).toContain('mock-storage');
      expect(result.vcJson).toHaveProperty('credentialSubject');
    });

    it('should handle issuance errors gracefully', async () => {
      // Test with invalid payload
      const invalidPayload = {};

      await expect(injiClient.issueVC(invalidPayload as any))
        .rejects.toThrow();
    });
  });

  describe('verifyVC', () => {
    it('should verify a valid VC in mock mode', async () => {
      const vcJson = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', 'AgriQualityCertificate'],
        credentialSubject: {
          id: 'did:example:farmer123',
          batchId: 'BATCH-2024-001'
        },
        issuer: 'did:example:agriqcert',
        issuanceDate: new Date().toISOString(),
        proof: { type: 'MockProof', value: 'mock_signature' }
      };

      const result = await injiClient.verifyVC({ vcJson });

      expect(result.valid).toBe(true);
      expect(result.signatureValid).toBe(true);
      expect(result.revoked).toBe(false);
      expect(result.issuer).toBe('did:example:agriqcert');
    });

    it('should detect invalid VCs', async () => {
      const invalidVc = { invalid: 'credential' };

      const result = await injiClient.verifyVC({ vcJson: invalidVc });

      expect(result.valid).toBe(false);
      expect(result.signatureValid).toBe(false);
    });
  });

  describe('parseWebhook', () => {
    it('should parse webhook payloads correctly', () => {
      const webhookPayload = {
        type: 'credential.issued',
        data: {
          vcId: 'vc_123',
          status: 'issued'
        }
      };

      const result = injiClient.parseWebhook(webhookPayload);

      expect(result.type).toBe('credential.issued');
      expect(result.data.vcId).toBe('vc_123');
    });
  });
});