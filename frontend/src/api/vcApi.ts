import { apiClient } from './apiClient';

// Types
export interface IssueVCRequest {
  batchId: string;
  inspectionId?: string;
}

export interface IssueVCResponse {
  jobId: string;
  status: string;
  batchId: string;
  inspectionId?: string;
  createdAt: string;
}

export interface JobStatus {
  id: string;
  batchId: string;
  inspectionId?: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  attempts: number;
  lastError?: string;
  result?: {
    vcId: string;
    vcUrl: string;
    certificateId: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Certificate {
  id: string;
  batchId: Record<string, unknown> | string; // Populated batch object or id
  vc: Record<string, unknown>;
  providerVcId?: string;
  vcUrl?: string;
  vcHash?: string;
  qrCodeData: string;
  status: 'active' | 'revoked' | 'expired';
  revoked: boolean;
  issuedBy: Record<string, unknown> | string; // Populated user object or id
  issuedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  revokedBy?: Record<string, unknown> | string;
  revocationReason?: string;
  metadata: Record<string, unknown>;
}

export interface VerifyVCRequest {
  vcJson?: Record<string, unknown>;
  vcUrl?: string;
  qrPayload?: string;
}

export interface VerifyVCResult {
  valid: boolean;
  signatureValid: boolean;
  revoked: boolean;
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: Record<string, unknown>;
  details?: string;
  locallyVerified: boolean;
  revocationChecked: boolean;
  certificateId?: string;
  errors?: string[];
}

export interface RevokeVCRequest {
  reason: 'compromised_key' | 'cessation_of_operation' | 'affiliation_changed' | 'superseded' | 'fraud' | 'quality_issue' | 'expired_inspection' | 'administrative' | 'other';
}

export interface VCStats {
  certificates: {
    total: number;
    active: number;
    revoked: number;
    expired: number;
  };
  jobs: {
    pending: number;
    failed: number;
  };
}

// API Functions

/**
 * Issue a new Verifiable Credential
 */
export const issueVC = async (request: IssueVCRequest): Promise<IssueVCResponse> => {
  const response = await apiClient.post('/vc/issue', request);
  return response.data.data;
};

/**
 * Get issuance job status
 */
export const getJobStatus = async (jobId: string): Promise<JobStatus> => {
  const response = await apiClient.get(`/vc/jobs/${jobId}`);
  return response.data.data;
};

/**
 * Get certificate by ID
 */
export const getCertificate = async (certificateId: string): Promise<Certificate> => {
  const response = await apiClient.get(`/vc/certificates/${certificateId}`);
  return response.data.data;
};

/**
 * Get certificate by batch ID
 */
export const getCertificateByBatch = async (batchId: string): Promise<Certificate | null> => {
  if (!batchId || batchId === 'undefined') {
    return null;
  }
  try {
    const response = await apiClient.get(`/vc/certificates/batch/${batchId}`);
    return response.data.data;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "response" in error &&
      (error as { response?: { status?: number } }).response?.status === 404
    ) {
      return null;
    }
    throw error;
  }
};

/**
 * Verify a Verifiable Credential
 */
export const verifyVC = async (request: VerifyVCRequest): Promise<VerifyVCResult> => {
  const response = await apiClient.post('/vc/verify', request);
  return response.data.data;
};

/**
 * Revoke a certificate
 */
export const revokeVC = async (certificateId: string, request: RevokeVCRequest): Promise<{
  certificateId: string;
  revocationId: string;
  revokedAt: string;
  reason: string;
}> => {
  const response = await apiClient.post(`/vc/certificates/${certificateId}/revoke`, request);
  return response.data.data;
};

/**
 * Get VC statistics
 */
export const getVCStats = async (): Promise<VCStats> => {
  const response = await apiClient.get('/vc/stats');
  return response.data.data;
};
