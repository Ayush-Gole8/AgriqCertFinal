import mongoose, { Schema, Document } from 'mongoose';
import { IBatch, ILocation, IBatchAttachment } from '../types/index.js';

export interface IBatchDocument extends IBatch, Document {
  id: string;
}

// Farm Address Schema
const farmAddressSchema = new Schema(
  {
    street: { type: String, trim: true },
    village: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, default: 'India' },
    postal_code: { type: String, trim: true },
  },
  { _id: false }
);

// GPS Point Schema
const gpsPointSchema = new Schema(
  {
    lat: { type: Number, required: true, min: -90, max: 90 },
    lon: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false }
);

// Quality Data Schema
const qualityDataSchema = new Schema(
  {
    moisturePercent: { type: Number, min: 0, max: 100 },
    foreignMatterPercent: { type: Number, min: 0, max: 100 },
    brokenGrainPercent: { type: Number, min: 0, max: 100 },
    labTestId: { type: String, trim: true },
  },
  { _id: false }
);

// Trade Data Schema
const tradeDataSchema = new Schema(
  {
    hsCode: { type: String, trim: true, match: /^\d{6,8}$/ },
    destinationCountry: { type: String, trim: true },
    portOfLoading: { type: String, trim: true },
    incoterm: { type: String, trim: true },
  },
  { _id: false }
);

// Photo Schema
const photoSchema = new Schema(
  {
    url: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    type: { type: String, enum: ['field', 'harvest', 'packing', 'weighbridge'], required: true },
    caption: { type: String, trim: true },
  },
  { _id: false }
);

// Data Provenance Schema
const dataProvenanceSchema = new Schema(
  {
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    clientVersion: { type: String, default: '1.0.0' },
  },
  { _id: false }
);

// Comprehensive Batch Metadata Schema
const batchMetadataSchema = new Schema(
  {
    batchId: { type: String, required: true, match: /^[A-Z0-9\-]{6,50}$/ },
    contactPhone: { type: String, required: true, match: /^\+?[1-9]\d{1,14}$/ },
    contactEmail: { type: String, trim: true, match: /^[\w\.-]+@[\w\.-]+\.\w+$/ },
    farmAddress: farmAddressSchema,
    landAreaHa: { type: Number, min: 0 },
    variety: { type: String, required: true, trim: true },
    plantingDate: { type: Date },
    lotNumber: { type: String, trim: true },
    packagingType: { type: String, enum: ['jute_sack', 'polybag', 'bulk_container', 'box', 'crate'] },
    numPackages: { type: Number, min: 0 },
    qualityData: qualityDataSchema,
    tradeData: tradeDataSchema,
    photos: [photoSchema],
    farmerDeclaration: { type: Boolean, required: true },
    signatureFarmer: { type: String, required: true },
    dataProvenance: dataProvenanceSchema,
    verificationHash: { type: String, trim: true },
  },
  { _id: false }
);

const locationSchema = new Schema<ILocation>(
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
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    region: {
      type: String,
      required: [true, 'Region is required'],
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const attachmentSchema = new Schema<IBatchAttachment>(
  {
    id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['image', 'document', 'certificate'],
      required: true,
    },
    url: {
      type: String,
      required: [true, 'File URL is required'],
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: [true, 'File size is required'],
      min: [0, 'File size must be positive'],
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const batchSchema = new Schema<IBatchDocument>(
  {
    farmerId: {
      type: String,
      required: [true, 'Farmer ID is required'],
      ref: 'User',
      index: true,
    },
    farmerName: {
      type: String,
      required: [true, 'Farmer name is required'],
      trim: true,
    },
    productType: {
      type: String,
      required: [true, 'Product type is required'],
      trim: true,
      index: true,
    },
    productName: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.01, 'Quantity must be positive'],
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      trim: true,
      enum: ['kg', 'tons', 'pieces', 'liters', 'bushels'],
      default: 'kg',
    },
    harvestDate: {
      type: Date,
      required: [true, 'Harvest date is required'],
      validate: {
        validator: function (value: Date) {
          return value <= new Date();
        },
        message: 'Harvest date cannot be in the future',
      },
    },
    location: {
      type: locationSchema,
      required: [true, 'Location is required'],
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'inspecting', 'approved', 'rejected', 'certified'],
      default: 'draft',
      index: true,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
      validate: {
        validator: function (arr: IBatchAttachment[]) {
          return arr.length <= 20;
        },
        message: 'Cannot have more than 20 attachments',
      },
    },
    // Comprehensive metadata containing all additional fields
    batchMetadata: {
      type: batchMetadataSchema,
      required: true,
    },
    submittedAt: {
      type: Date,
    },
    approvedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
    certifiedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret) {
        const { _id, __v, ...batchObj } = ret;
        void __v;
        return { ...batchObj, id: _id.toString() };
      },
    },
    toObject: {
      virtuals: true,
    },
  }
);

// Indexes for efficient querying
batchSchema.index({ farmerId: 1, status: 1 });
batchSchema.index({ status: 1, createdAt: -1 });
batchSchema.index({ productType: 1, productName: 1 });
batchSchema.index({ 'location.region': 1 });
batchSchema.index({ createdAt: -1 });
batchSchema.index({ harvestDate: -1 });
batchSchema.index({ 'batchMetadata.batchId': 1 }, { unique: true });

// Text search index
batchSchema.index({
  productName: 'text',
  productType: 'text',
  farmerName: 'text',
  'location.address': 'text',
  'batchMetadata.batchId': 'text',
});

// Pre-save hook to generate verification hash
batchSchema.pre('save', function(next) {
  if (this.isModified('batchMetadata') || this.isNew) {
    const crypto = require('crypto');
    
    // Create canonical string of essential fields for hash
    const essentialData = {
      batchId: this.batchMetadata?.batchId,
      farmerId: this.farmerId,
      productType: this.productType,
      quantity: this.quantity,
      harvestDate: this.harvestDate,
      location: this.location,
      farmerDeclaration: this.batchMetadata?.farmerDeclaration,
    };
    
    const canonicalString = JSON.stringify(essentialData, Object.keys(essentialData).sort());
    this.batchMetadata.verificationHash = crypto.createHash('sha256').update(canonicalString).digest('hex');
  }
  next();
});

// Post-save hook to notify inspectors when batch is submitted
batchSchema.post('save', async function(doc) {
  if (doc.status === 'submitted' && doc.isModified('status')) {
    try {
      // Import here to avoid circular dependency
      const { default: mongoose } = await import('mongoose');
      const Notification = mongoose.model('Notification');
      
      // Find available inspectors (you may want to implement a more sophisticated assignment logic)
      const User = mongoose.model('User');
      const inspectors = await User.find({ role: 'qa_inspector', isActive: true }).limit(5);
      
      // Create notifications for inspectors
      for (const inspector of inspectors) {
        await Notification.create({
          userId: inspector._id,
          type: 'batch_submitted',
          title: 'New Batch for Inspection',
          message: `Batch ${doc.batchMetadata?.batchId} (${doc.productName}) has been submitted by ${doc.farmerName} for quality inspection.`,
          data: {
            batchId: doc._id,
            batchIdCustom: doc.batchMetadata?.batchId,
            farmerId: doc.farmerId,
            farmerName: doc.farmerName,
            productName: doc.productName,
            location: doc.location?.address,
          },
          priority: 'high',
        });
      }
    } catch (error) {
      console.error('Failed to create inspector notifications:', error);
    }
  }
});

// Virtual for inspections
batchSchema.virtual('inspections', {
  ref: 'Inspection',
  localField: '_id',
  foreignField: 'batchId',
});

// Virtual for certificates
batchSchema.virtual('certificates', {
  ref: 'Certificate',
  localField: '_id',
  foreignField: 'batchId',
});

// Pre-save middleware to update status timestamps
batchSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    const now = new Date();
    switch (this.status) {
      case 'submitted':
        if (!this.submittedAt) this.submittedAt = now;
        break;
      case 'approved':
        if (!this.approvedAt) this.approvedAt = now;
        break;
      case 'rejected':
        if (!this.rejectedAt) this.rejectedAt = now;
        break;
      case 'certified':
        if (!this.certifiedAt) this.certifiedAt = now;
        break;
    }
  }
  next();
});

export const Batch = mongoose.model<IBatchDocument>('Batch', batchSchema);
