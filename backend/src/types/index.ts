// User & Auth Types
export type UserRole = 'farmer' | 'qa_inspector' | 'certifier' | 'admin' | 'verifier';

export interface IUser {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  avatar?: string;
  organization?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  isVerified: boolean;
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  lastLogin?: Date;
  refreshTokens: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Batch Types
export type BatchStatus = 'draft' | 'submitted' | 'inspecting' | 'approved' | 'rejected' | 'certified';

export interface ILocation {
  latitude: number;
  longitude: number;
  address: string;
  region: string;
  country?: string;
}

export interface IBatchAttachment {
  id: string;
  name: string;
  type: 'image' | 'document' | 'certificate';
  url: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

export interface IBatch {
  farmerId: string;
  farmerName: string;
  productType: string;
  productName: string;
  quantity: number;
  unit: string;
  harvestDate: Date;
  location: ILocation;
  status: BatchStatus;
  attachments: IBatchAttachment[];
  submittedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  certifiedAt?: Date;
  rejectionReason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Draft Types
export interface IBatchDraft {
  userId: string;
  data: Record<string, any>;
  step: number;
  lastSavedAt: Date;
  expiresAt: Date;
}

// Inspection Types
export type InspectionStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface IInspectionReading {
  parameter: string;
  value: number | string;
  unit: string;
  minThreshold?: number;
  maxThreshold?: number;
  passed: boolean;
}

export interface IQualityReading {
  moisturePercent?: number;
  pesticidePPM?: number;
  temperatureC?: number;
  isOrganic?: boolean;
  physicalNotes: string;
}

export interface IGeospatialData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  isoCode: string;
  region: string;
}

export interface IFileMetadata {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  description?: string;
}

export interface IInspectionOutcome {
  classification: 'pass' | 'fail' | 'conditional_pass' | 'requires_retest';
  reasoning: string;
  recommendations: string[];
  followUpRequired: boolean;
  complianceNotes: string;
}

export interface IGeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

export interface IInspection {
  batchId: string;
  inspectorId: string;
  inspectorName: string;
  status: InspectionStatus;
  readings: IInspectionReading[];
  qualityReadings: IQualityReading;
  geospatialData: IGeospatialData;
  photos: IFileMetadata[];
  labReports: IFileMetadata[];
  notes: string;
  completedAt?: Date;
  overallResult: 'pass' | 'fail' | 'pending';
  outcome?: IInspectionOutcome;
  draftSavedAt?: Date;
  validationRules?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Certificate & VC Types
export type CertificateStatus = 'active' | 'revoked' | 'expired';

export interface IVerifiableCredential {
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
    [key: string]: any;
  };
  proof?: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    jws?: string;
  };
}

export interface ICertificate {
  batchId: string;
  vc: IVerifiableCredential;
  providerVcId?: string;
  vcUrl?: string;
  vcHash?: string;
  qrCodeData: string;
  qrCodeImage?: string;
  status: CertificateStatus;
  revoked: boolean;
  issuedBy: string;
  issuedAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  revokedBy?: string;
  revocationReason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Notification Types
export type NotificationType = 
  | 'batch_submitted' 
  | 'inspection_complete' 
  | 'certificate_issued' 
  | 'certificate_revoked' 
  | 'action_required'
  | 'batch_approved'
  | 'batch_rejected';

export interface INotification {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Audit Log Types
export interface IAuditLog {
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Query Types
export interface QueryOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}
