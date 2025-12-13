// User & Auth Types
export type UserRole = 'farmer' | 'qa_inspector' | 'certifier' | 'admin' | 'verifier';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  organization?: string;
  phone?: string;
  address?: string;
  isActive?: boolean;
  isVerified?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Batch Types
export type BatchStatus = 'draft' | 'submitted' | 'inspecting' | 'approved' | 'rejected' | 'certified';

export interface BatchAttachment {
  id: string;
  name: string;
  type: 'image' | 'document' | 'certificate';
  url: string;
  uploadedAt: string;
  size: number;
}

export interface Batch {
  id: string;
  farmerId: string;
  farmerName: string;
  productType: string;
  productName: string;
  quantity: number;
  unit: string;
  harvestDate: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
    region: string;
    country?: string;
  };
  status: BatchStatus;
  attachments: BatchAttachment[];
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  certifiedAt?: string;
}

export interface BatchDraft {
  id: string;
  data: Partial<Batch>;
  step: number;
  lastSavedAt: string;
}

// Inspection Types
export type InspectionStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface InspectionReading {
  parameter: string;
  value: number | string;
  unit: string;
  minThreshold?: number;
  maxThreshold?: number;
  passed: boolean;
}

export interface Inspection {
  id: string;
  batchId: string;
  inspectorId: string;
  inspectorName: string;
  status: InspectionStatus;
  readings: InspectionReading[];
  photos?: string[];
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  overallResult: 'pass' | 'fail' | 'pending';
}

// Certificate & VC Types
export type CertificateStatus = 'active' | 'revoked' | 'expired';

export interface VerifiableCredential {
  '@context': string[];
  type: string[];
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: {
    id: string;
    batchId: string;
    productName: string;
    productType: string;
    certificationStandard: string;
    inspectionDate: string;
    inspectorId: string;
    location: string;
    [key: string]: unknown;
  };
  proof?: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    jws?: string;
  };
}

export interface Certificate {
  id: string;
  batchId: string;
  vc: VerifiableCredential;
  qrCodeData: string;
  status: CertificateStatus;
  issuedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  revocationReason?: string;
}

export interface VerificationResult {
  isValid: boolean;
  certificate?: Certificate;
  batch?: Batch;
  inspection?: Inspection;
  errors?: string[];
  verifiedAt: string;
  timeline: {
    event: string;
    date: string;
    actor: string;
    status: 'completed' | 'current' | 'pending';
  }[];
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: 'batch_submitted' | 'inspection_complete' | 'certificate_issued' | 'certificate_revoked' | 'action_required';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Backend Response Wrappers (for reference, though API client handles extraction)
export interface BackendBatchResponse {
  success: boolean;
  data: {
    batch: Batch;
  };
  message?: string;
}

export interface BackendInspectionResponse {
  success: boolean;
  data: {
    inspection: Inspection;
  };
  message?: string;
}

export interface BackendInspectionsListResponse {
  success: boolean;
  data: {
    inspections: Inspection[];
  };
  message?: string;
}

// Form Types
export interface BatchFormData {
  productType: string;
  productName: string;
  quantity: number;
  unit: string;
  harvestDate: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    region: string;
  };
  attachments: File[];
}

export interface InspectionFormData {
  readings: {
    parameter: string;
    value: number | string;
    unit: string;
  }[];
  photos: File[];
  notes: string;
}

// Utility Types
export type CreateBatchPayload = Omit<Batch, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'submittedAt' | 'certifiedAt'>;

export type UpdateBatchPayload = Partial<Pick<Batch, 'productType' | 'productName' | 'quantity' | 'unit' | 'harvestDate' | 'location'>>;

export type CreateInspectionPayload = Omit<Inspection, 'id' | 'createdAt' | 'updatedAt' | 'completedAt' | 'overallResult' | 'status'>;

// API Error Types
export interface ApiError {
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
  statusCode?: number;
}

// Loading States
export interface LoadingStates {
  isLoading: boolean;
  isError: boolean;
  error?: ApiError | null;
}
