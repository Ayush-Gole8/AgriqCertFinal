import mongoose, { Schema, Document } from 'mongoose';
import { 
  IInspection, 
  IInspectionReading, 
  IQualityReading,
  IGeospatialData,
  IFileMetadata,
  IInspectionOutcome
} from '../types/index.js';

export interface IInspectionDocument extends IInspection, Document {
  id: string;
  validateQualityReadings(): boolean;
}

const readingSchema = new Schema<IInspectionReading>(
  {
    parameter: {
      type: String,
      required: [true, 'Parameter name is required'],
      trim: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: [true, 'Parameter value is required'],
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      trim: true,
    },
    minThreshold: {
      type: Number,
    },
    maxThreshold: {
      type: Number,
    },
    passed: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  { _id: false }
);

const qualityReadingSchema = new Schema<IQualityReading>(
  {
    moisturePercent: {
      type: Number,
      min: [0, 'Moisture percentage must be non-negative'],
      max: [100, 'Moisture percentage cannot exceed 100%'],
    },
    pesticidePPM: {
      type: Number,
      min: [0, 'Pesticide PPM must be non-negative'],
    },
    temperatureC: {
      type: Number,
      min: [-50, 'Temperature must be above -50°C'],
      max: [100, 'Temperature must be below 100°C'],
    },
    isOrganic: {
      type: Boolean,
      default: false,
    },
    physicalNotes: {
      type: String,
      required: [true, 'Physical notes are required'],
      trim: true,
      maxlength: [1000, 'Physical notes cannot exceed 1000 characters'],
    },
  },
  { _id: false }
);

const geospatialDataSchema = new Schema<IGeospatialData>(
  {
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90'],
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180'],
    },
    accuracy: {
      type: Number,
      required: [true, 'Accuracy is required'],
      min: [0, 'Accuracy must be positive'],
    },
    timestamp: {
      type: Date,
      required: [true, 'Timestamp is required'],
      default: Date.now,
    },
    isoCode: {
      type: String,
      required: [true, 'ISO country code is required'],
      trim: true,
      uppercase: true,
      match: [/^[A-Z]{2}$/, 'ISO code must be a 2-letter country code'],
    },
    region: {
      type: String,
      required: [true, 'Region is required'],
      trim: true,
      maxlength: [100, 'Region cannot exceed 100 characters'],
    },
  },
  { _id: false }
);

const fileMetadataSchema = new Schema<IFileMetadata>(
  {
    id: {
      type: String,
      required: [true, 'File ID is required'],
    },
    filename: {
      type: String,
      required: [true, 'Filename is required'],
      trim: true,
    },
    url: {
      type: String,
      required: [true, 'File URL is required'],
    },
    size: {
      type: Number,
      required: [true, 'File size is required'],
      min: [0, 'File size must be non-negative'],
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
      trim: true,
    },
    uploadedAt: {
      type: Date,
      required: [true, 'Upload timestamp is required'],
      default: Date.now,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
  },
  { _id: false }
);

const inspectionOutcomeSchema = new Schema<IInspectionOutcome>(
  {
    classification: {
      type: String,
      enum: ['pass', 'fail', 'conditional_pass', 'requires_retest'],
      required: [true, 'Classification is required'],
    },
    reasoning: {
      type: String,
      required: [true, 'Reasoning is required'],
      trim: true,
      maxlength: [2000, 'Reasoning cannot exceed 2000 characters'],
    },
    recommendations: {
      type: [String],
      default: [],
      validate: {
        validator: function (arr: string[]) {
          return arr.length <= 20;
        },
        message: 'Cannot have more than 20 recommendations',
      },
    },
    followUpRequired: {
      type: Boolean,
      required: [true, 'Follow-up requirement must be specified'],
      default: false,
    },
    complianceNotes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Compliance notes cannot exceed 1000 characters'],
      default: '',
    },
  },
  { _id: false }
);

const inspectionSchema = new Schema<IInspectionDocument>(
  {
    batchId: {
      type: String,
      required: [true, 'Batch ID is required'],
      ref: 'Batch',
      index: true,
    },
    inspectorId: {
      type: String,
      required: [true, 'Inspector ID is required'],
      ref: 'User',
      index: true,
    },
    inspectorName: {
      type: String,
      required: [true, 'Inspector name is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    readings: {
      type: [readingSchema],
      default: [],
    },
    qualityReadings: {
      type: qualityReadingSchema,
      required: [true, 'Quality readings are required'],
    },
    geospatialData: {
      type: geospatialDataSchema,
      required: [true, 'Geospatial data is required'],
    },
    photos: {
      type: [fileMetadataSchema],
      default: [],
      validate: {
        validator: function (arr: IFileMetadata[]) {
          return arr.length <= 50;
        },
        message: 'Cannot have more than 50 photos',
      },
    },
    labReports: {
      type: [fileMetadataSchema],
      default: [],
      validate: {
        validator: function (arr: IFileMetadata[]) {
          return arr.length <= 10;
        },
        message: 'Cannot have more than 10 lab reports',
      },
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
      default: '',
    },
    completedAt: {
      type: Date,
    },
    overallResult: {
      type: String,
      enum: ['pass', 'fail', 'pending'],
      default: 'pending',
    },
    outcome: {
      type: inspectionOutcomeSchema,
    },
    draftSavedAt: {
      type: Date,
    },
    validationRules: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret) {
        const { _id, __v, ...inspectionObj } = ret;
        return { ...inspectionObj, id: _id.toString() };
      },
    },
    toObject: {
      virtuals: true,
    },
  }
);

// Indexes for efficient querying
inspectionSchema.index({ batchId: 1, createdAt: -1 });
inspectionSchema.index({ inspectorId: 1, status: 1 });
inspectionSchema.index({ status: 1, createdAt: -1 });
inspectionSchema.index({ overallResult: 1 });
inspectionSchema.index({ createdAt: -1 });
inspectionSchema.index({ draftSavedAt: 1 });

// Pre-save middleware to calculate overall result and update draft timestamp
inspectionSchema.pre('save', function (next) {
  if (this.isModified('readings') || this.isModified('qualityReadings') || this.isModified('status')) {
    if (this.status === 'completed') {
      // Calculate overall result based on readings and quality data
      const readingsPassed = this.readings.length === 0 || this.readings.every((reading) => reading.passed);
      const qualityValidation = this.validateQualityReadings();
      
      this.overallResult = readingsPassed && qualityValidation ? 'pass' : 'fail';
      
      if (!this.completedAt) {
        this.completedAt = new Date();
      }
    } else if (this.status === 'in_progress') {
      // Update draft timestamp for autosave functionality
      this.draftSavedAt = new Date();
    }
  }
  next();
});

// Method to validate quality readings against rules
inspectionSchema.methods.validateQualityReadings = function() {
  const rules = this.validationRules || {};
  
  if (rules.maxMoisturePercent && this.qualityReadings.moisturePercent > rules.maxMoisturePercent) {
    return false;
  }
  
  if (rules.maxPesticidePPM && this.qualityReadings.pesticidePPM > rules.maxPesticidePPM) {
    return false;
  }
  
  if (rules.requiresOrganic && !this.qualityReadings.isOrganic) {
    return false;
  }
  
  return true;
};

// Virtual for batch
inspectionSchema.virtual('batch', {
  ref: 'Batch',
  localField: 'batchId',
  foreignField: '_id',
  justOne: true,
});

// Virtual for inspector
inspectionSchema.virtual('inspector', {
  ref: 'User',
  localField: 'inspectorId',
  foreignField: '_id',
  justOne: true,
});

export const Inspection = mongoose.model<IInspectionDocument>('Inspection', inspectionSchema);
