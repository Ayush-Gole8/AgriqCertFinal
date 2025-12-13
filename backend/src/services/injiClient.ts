import axios, { AxiosInstance, AxiosError } from 'axios';
import crypto from 'crypto';
import { nanoid } from 'nanoid';
import config from '../config/index.js';

export interface VCPayload {
  credentialSubject: Record<string, any>;
  issuer?: string;
  type?: string[];
  '@context'?: string[];
  expirationDate?: string;
  [key: string]: any;
}

export interface IssueVCResponse {
  vcId: string;
  vcUrl: string;
  vcJson: Record<string, any>;
}

export interface VerifyVCRequest {
  vcJson?: Record<string, any>;
  vcUrl?: string;
}

export interface VerifyVCResponse {
  valid: boolean;
  signatureValid: boolean;
  revoked: boolean;
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: Record<string, any>;
  details?: string;
}

export interface PushToWalletRequest {
  userId: string;
  vcJson: Record<string, any>;
  walletId?: string;
}

export interface WebhookPayload {
  vcId: string;
  status: 'issued' | 'revoked' | 'expired';
  timestamp: string;
  signature: string;
  [key: string]: any;
}

export class InjiClientError extends Error {
  constructor(
    public message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'InjiClientError';
  }
}

class InjiClient {
  private httpClient: AxiosInstance;
  private isMockMode: boolean;
  private apiKey: string;
  private issuerDid: string;
  private webhookSecret: string;

  constructor() {
    this.isMockMode = !config.inji.apiKey || config.inji.mockMode === 'true';
    this.apiKey = config.inji.apiKey || '';
    this.issuerDid = config.inji.issuerDid || 'did:example:agriqcert';
    this.webhookSecret = config.inji.webhookSecret || '';

    this.httpClient = axios.create({
      baseURL: config.inji.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
      },
    });

    // Add request interceptor for logging
    this.httpClient.interceptors.request.use(
      (config) => {
        if (!this.isMockMode) {
          console.log(`[InjiClient] ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const message = error.response?.data 
          ? `Inji API Error: ${JSON.stringify(error.response.data)}`
          : error.message;
        throw new InjiClientError(
          message,
          error.response?.status,
          error.response?.data
        );
      }
    );
  }

  /**
   * Issue a Verifiable Credential
   */
  async issueVC(payload: VCPayload): Promise<IssueVCResponse> {
    if (this.isMockMode) {
      return this._mockIssueVC(payload);
    }

    try {
      const response = await this._retryOperation(async () => {
        return await this.httpClient.post('/v1/credentials/issue', {
          credential: {
            '@context': payload['@context'] || ['https://www.w3.org/2018/credentials/v1'],
            type: payload.type || ['VerifiableCredential', 'AgricultureQualityCertificate'],
            issuer: payload.issuer || this.issuerDid,
            issuanceDate: new Date().toISOString(),
            expirationDate: payload.expirationDate,
            credentialSubject: payload.credentialSubject,
          },
        });
      });

      return {
        vcId: response.data.id,
        vcUrl: response.data.url,
        vcJson: response.data.credential,
      };
    } catch (error) {
      console.error('[InjiClient] Issue VC failed:', error);
      throw error instanceof InjiClientError ? error : new InjiClientError('Failed to issue VC', 500);
    }
  }

  /**
   * Verify a Verifiable Credential
   */
  async verifyVC(request: VerifyVCRequest): Promise<VerifyVCResponse> {
    if (this.isMockMode) {
      return this._mockVerifyVC(request);
    }

    try {
      const response = await this._retryOperation(async () => {
        return await this.httpClient.post('/v1/credentials/verify', {
          credential: request.vcJson,
          credentialUrl: request.vcUrl,
        });
      });

      const result = response.data;
      return {
        valid: result.valid,
        signatureValid: result.signatureValid,
        revoked: result.revoked || false,
        issuer: result.issuer,
        issuanceDate: result.issuanceDate,
        expirationDate: result.expirationDate,
        credentialSubject: result.credentialSubject,
        details: result.details,
      };
    } catch (error) {
      console.error('[InjiClient] Verify VC failed:', error);
      throw error instanceof InjiClientError ? error : new InjiClientError('Failed to verify VC', 500);
    }
  }

  /**
   * Get a Verifiable Credential by ID
   */
  async getVC(vcId: string): Promise<Record<string, any>> {
    if (this.isMockMode) {
      return this._mockGetVC(vcId);
    }

    try {
      const response = await this._retryOperation(async () => {
        return await this.httpClient.get(`/v1/credentials/${vcId}`);
      });

      return response.data.credential;
    } catch (error) {
      console.error('[InjiClient] Get VC failed:', error);
      throw error instanceof InjiClientError ? error : new InjiClientError('Failed to get VC', 500);
    }
  }

  /**
   * Push credential to user's wallet
   */
  async pushToWallet(request: PushToWalletRequest): Promise<{ success: boolean; walletId?: string }> {
    if (this.isMockMode) {
      return this._mockPushToWallet(request);
    }

    try {
      const response = await this._retryOperation(async () => {
        return await this.httpClient.post('/v1/wallet/push', {
          userId: request.userId,
          credential: request.vcJson,
          walletId: request.walletId,
        });
      });

      return {
        success: response.data.success,
        walletId: response.data.walletId,
      };
    } catch (error) {
      console.error('[InjiClient] Push to wallet failed:', error);
      throw error instanceof InjiClientError ? error : new InjiClientError('Failed to push to wallet', 500);
    }
  }

  /**
   * Parse and verify webhook payload
   */
  parseWebhook(body: string | any, signature?: string): WebhookPayload {
    // In mock mode, just return the payload directly
    if (this.isMockMode) {
      if (typeof body === 'object') {
        return body as WebhookPayload;
      }
      try {
        return JSON.parse(body) as WebhookPayload;
      } catch (error) {
        throw new InjiClientError('Invalid webhook payload', 400);
      }
    }

    if (!this.webhookSecret) {
      throw new InjiClientError('Webhook secret not configured', 400);
    }

    if (!signature) {
      throw new InjiClientError('Webhook signature is required', 400);
    }

    // Verify HMAC signature
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(body as string)
      .digest('hex');
    
    const receivedSignature = signature.replace('sha256=', '');
    
    if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(receivedSignature))) {
      throw new InjiClientError('Invalid webhook signature', 401);
    }

    try {
      const payload = JSON.parse(body as string);
      return payload as WebhookPayload;
    } catch (error) {
      throw new InjiClientError('Invalid webhook payload', 400);
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  private async _retryOperation<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        console.log(`[InjiClient] Retry attempt ${attempt + 1} after ${delay}ms`);
      }
    }
    
    throw lastError!;
  }

  // Mock implementations for development/testing
  private _mockIssueVC(payload: VCPayload): IssueVCResponse {
    const vcId = `vc_mock_${nanoid()}`;
    const vcJson = {
      '@context': payload['@context'] || ['https://www.w3.org/2018/credentials/v1'],
      type: payload.type || ['VerifiableCredential', 'AgricultureQualityCertificate'],
      id: `https://api.agriqcert.com/credentials/${vcId}`,
      issuer: payload.issuer || this.issuerDid,
      issuanceDate: new Date().toISOString(),
      expirationDate: payload.expirationDate,
      credentialSubject: {
        ...payload.credentialSubject,
        id: payload.credentialSubject.id || `did:example:${nanoid()}`,
      },
      proof: {
        type: 'Ed25519Signature2020',
        created: new Date().toISOString(),
        verificationMethod: `${this.issuerDid}#key-1`,
        proofPurpose: 'assertionMethod',
        proofValue: 'mock_signature_' + nanoid(),
      },
    };

    console.log(`[InjiClient] Mock issued VC: ${vcId}`);
    
    return {
      vcId,
      vcUrl: `https://mock-storage.agriqcert.com/credentials/${vcId}`,
      vcJson,
    };
  }

  private _mockVerifyVC(request: VerifyVCRequest): VerifyVCResponse {
    const vcJson = request.vcJson;
    if (!vcJson) {
      throw new InjiClientError('No VC JSON provided for mock verification', 400);
    }

    console.log('[InjiClient] Mock verifying VC');
    
    // Check for invalid VC structure
    const isValid = vcJson && 
                   vcJson.credentialSubject && 
                   vcJson.issuer && 
                   vcJson.issuanceDate &&
                   vcJson.proof;
    
    return {
      valid: isValid,
      signatureValid: isValid,
      revoked: false,
      issuer: vcJson.issuer || this.issuerDid,
      issuanceDate: vcJson.issuanceDate || new Date().toISOString(),
      expirationDate: vcJson.expirationDate,
      credentialSubject: vcJson.credentialSubject || {},
      details: 'Mock verification successful',
    };
  }

  private _mockGetVC(vcId: string): Record<string, any> {
    console.log(`[InjiClient] Mock getting VC: ${vcId}`);
    
    return {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential', 'AgricultureQualityCertificate'],
      id: `https://api.agriqcert.com/credentials/${vcId}`,
      issuer: this.issuerDid,
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: `did:example:${vcId}`,
        productType: 'Mock Product',
        quality: 'Premium',
      },
      proof: {
        type: 'Ed25519Signature2020',
        proofValue: 'mock_signature_' + nanoid(),
      },
    };
  }

  private _mockPushToWallet(request: PushToWalletRequest): { success: boolean; walletId?: string } {
    console.log(`[InjiClient] Mock pushing to wallet for user: ${request.userId}`);
    
    return {
      success: true,
      walletId: `wallet_${request.userId}_${nanoid()}`,
    };
  }
}

// Export singleton instance
export const injiClient = new InjiClient();
export default injiClient;