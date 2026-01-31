import { z } from 'zod';

// GPS Point Schema
const gpsPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
  altitude: z.number().optional(),
});

// Farm Address Schema
const farmAddressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  country: z.string().min(1, 'Country is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
});

// Photo Schema
const photoSchema = z.object({
  url: z.string().url('Invalid photo URL'),
  caption: z.string().optional(),
  takenAt: z.date().optional(),
  fileSize: z.number().positive().optional(),
  mimeType: z.string().optional(),
});

// Data Provenance Schema
const dataProvenanceSchema = z.object({
  source: z.string().min(1, 'Data source is required'),
  collectedBy: z.string().min(1, 'Collector name is required'),
  collectedAt: z.date(),
  gpsSource: z.string().optional(),
  deviceInfo: z.string().optional(),
});

// Main Batch Submission Schema
export const batchSubmissionSchema = z.object({
  // Basic/Identity Section
  farmerName: z.string().min(2, 'Farmer name must be at least 2 characters'),
  contactPhone: z.string().min(10, 'Phone number must be at least 10 digits').optional(),
  contactEmail: z.string().email('Invalid email address').optional(),

  // Farm & Origin Section
  farmAddress: farmAddressSchema,
  farmGeoPoint: gpsPointSchema,
  landAreaHa: z.number().positive('Land area must be positive').optional(),

  // Crop & Batch Section
  crop: z.string().min(1, 'Crop type is required'),
  variety: z.string().min(1, 'Crop variety is required').optional(),
  plantingDate: z.date().optional(),
  harvestDate: z.date({
    required_error: 'Harvest date is required',
  }),
  lotNumber: z.string().optional(),
  quantityNetKg: z.number().positive('Quantity must be positive'),
  packagingType: z.string().optional(),
  numPackages: z.number().int().positive('Number of packages must be a positive integer').optional(),

  // Quality & Lab Section
  inspectionDate: z.date().optional(),
  inspectorId: z.string().optional(),
  inspectorName: z.string().optional(),
  inspectionResult: z.enum(['pending', 'passed', 'failed', 'requires_retest']).default('pending'),
  moisturePercent: z.number().min(0).max(100, 'Moisture percentage must be between 0-100').optional(),
  foreignMatterPercent: z.number().min(0).max(100, 'Foreign matter percentage must be between 0-100').optional(),
  brokenGrainPercent: z.number().min(0).max(100, 'Broken grain percentage must be between 0-100').optional(),
  labTestId: z.string().optional(),
  labReportUrl: z.string().url('Invalid lab report URL').optional(),

  // Compliance & Trade Section
  hsCode: z.string().optional(),
  destinationCountry: z.string().optional(),
  portOfLoading: z.string().optional(),
  incoterm: z.string().optional(),

  // Attachments Section
  photos: z.array(photoSchema).optional(),
  labReportPdf: z.string().url('Invalid PDF URL').optional(),

  // Declarations Section
  farmerDeclaration: z.boolean({
    required_error: 'Farmer declaration is required',
    invalid_type_error: 'Farmer declaration must be accepted',
  }).refine(val => val === true, {
    message: 'You must accept the farmer declaration to proceed',
  }),
  signatureFarmer: z.string().optional(),
  dataProvenance: dataProvenanceSchema,
});

// Additional validation schemas for specific steps
export const basicIdentitySchema = batchSubmissionSchema.pick({
  farmerName: true,
  contactPhone: true,
  contactEmail: true,
});

export const farmOriginSchema = batchSubmissionSchema.pick({
  farmAddress: true,
  farmGeoPoint: true,
  landAreaHa: true,
});

export const cropBatchSchema = batchSubmissionSchema.pick({
  crop: true,
  variety: true,
  plantingDate: true,
  harvestDate: true,
  lotNumber: true,
  quantityNetKg: true,
  packagingType: true,
  numPackages: true,
});

export const qualityLabSchema = batchSubmissionSchema.pick({
  inspectionDate: true,
  inspectorId: true,
  inspectorName: true,
  inspectionResult: true,
  moisturePercent: true,
  foreignMatterPercent: true,
  brokenGrainPercent: true,
  labTestId: true,
  labReportUrl: true,
});

export const complianceTradeSchema = batchSubmissionSchema.pick({
  hsCode: true,
  destinationCountry: true,
  portOfLoading: true,
  incoterm: true,
});

export const attachmentsSchema = batchSubmissionSchema.pick({
  photos: true,
  labReportPdf: true,
});

export const declarationsSchema = batchSubmissionSchema.pick({
  farmerDeclaration: true,
  signatureFarmer: true,
  dataProvenance: true,
});

// Type inference
export type BatchSubmissionFormData = z.infer<typeof batchSubmissionSchema>;
export type BasicIdentityFormData = z.infer<typeof basicIdentitySchema>;
export type FarmOriginFormData = z.infer<typeof farmOriginSchema>;
export type CropBatchFormData = z.infer<typeof cropBatchSchema>;
export type QualityLabFormData = z.infer<typeof qualityLabSchema>;
export type ComplianceTradeFormData = z.infer<typeof complianceTradeSchema>;
export type AttachmentsFormData = z.infer<typeof attachmentsSchema>;
export type DeclarationsFormData = z.infer<typeof declarationsSchema>;