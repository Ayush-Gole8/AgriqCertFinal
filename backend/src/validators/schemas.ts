import { z } from 'zod';
import { Types } from 'mongoose';

// Custom ObjectId validation
const objectIdSchema = z.string().refine((value) => {
  return Types.ObjectId.isValid(value);
}, {
  message: 'Invalid ObjectId format',
});

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[@$!%*?&#]/, 'Password must contain at least one special character'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  role: z.enum(['farmer', 'qa_inspector', 'certifier', 'verifier']).optional(),
  organization: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[@$!%*?&#]/, 'Password must contain at least one special character'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  avatar: z.string().url().optional(),
  organization: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

// Batch schemas
export const createBatchSchema = z.object({
  productType: z.string().min(1, 'Product type is required'),
  productName: z.string().min(1, 'Product name is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.enum(['kg', 'tonne', 'gram', 'lbs', 'oz', 'quintal', 'bag', 'box', 'crate', 'liter', 'gallon']),
  harvestDate: z.string().min(1, 'Harvest date is required'),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    address: z.string().min(1),
    region: z.string().min(1),
    country: z.string().optional(),
  }),
  attachments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['image', 'document', 'certificate']),
    url: z.string(),
    mimeType: z.string(),
    size: z.number().positive(),
  })).optional(),
  metadata: z.record(z.any()).optional(),
});

export const updateBatchSchema = createBatchSchema.partial();

// Inspection schemas
export const createInspectionSchema = z.object({
  readings: z.array(z.object({
    parameter: z.string().min(1),
    value: z.union([z.string(), z.number()]),
    unit: z.string().min(1),
    minThreshold: z.number().optional(),
    maxThreshold: z.number().optional(),
    passed: z.boolean(),
  })).min(1, 'At least one reading is required'),
  photos: z.array(z.string()).optional(),
  geolocation: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().positive(),
    timestamp: z.string().or(z.date()),
  }).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateInspectionSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']).optional(),
  readings: z.array(z.object({
    parameter: z.string().min(1),
    value: z.union([z.string(), z.number()]),
    unit: z.string().min(1),
    minThreshold: z.number().optional(),
    maxThreshold: z.number().optional(),
    passed: z.boolean(),
  })).optional(),
  photos: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional(),
});

export const inspectionQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']).optional(),
  batchId: objectIdSchema.optional(),
  inspectorId: objectIdSchema.optional(),
});

// Certificate / VC schemas
export const issueCertificateSchema = z.object({
  batchId: objectIdSchema,
  expiryDays: z.number().positive().optional(),
});

export const revokeCertificateSchema = z.object({
  reason: z.enum([
    'compromised_key',
    'cessation_of_operation',
    'affiliation_changed',
    'superseded',
    'fraud',
    'quality_issue',
    'expired_inspection',
    'administrative',
    'other',
  ]),
});

export const issueVCSchema = z.object({
  batchId: z.string().min(1, 'Batch ID is required'),
  inspectionId: z.string().optional(),
});

export const verifyVCSchema = z
  .object({
    vcJson: z.record(z.any()).optional(),
    vcUrl: z.string().url().optional(),
    qrPayload: z.string().optional(),
  })
  .refine(
    (data) => data.vcJson || data.vcUrl || data.qrPayload,
    {
      message: 'One of vcJson, vcUrl, or qrPayload is required',
    },
  );

// Draft schemas
export const saveDraftSchema = z.object({
  data: z.record(z.any()),
  step: z.number().min(0),
});

// Query schemas
export const paginationSchema = z.object({
  page: z.string().optional().transform(val => (val ? parseInt(val) : 1)),
  limit: z.string().optional().transform(val => (val ? parseInt(val) : 10)),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
});

export const batchQuerySchema = paginationSchema.extend({
  status: z.enum(['draft', 'submitted', 'inspecting', 'approved', 'rejected', 'certified']).optional(),
  productType: z.string().optional(),
});

// Param schemas
export const idParamSchema = z.object({
  id: objectIdSchema,
});
