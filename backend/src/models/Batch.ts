import mongoose, { Schema, Document } from 'mongoose';
import { IBatch, ILocation, IBatchAttachment } from '../types/index.js';

export interface IBatchDocument extends IBatch, Document {
  id: string;
}

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

// Text search index
batchSchema.index({
  productName: 'text',
  productType: 'text',
  farmerName: 'text',
  'location.address': 'text',
});

// Virtual for inspections
batchSchema.virtual('inspections', {
  ref: 'Inspection',
  localField: '_id',
  foreignField: 'batchId',
});

// Virtual for certificate
batchSchema.virtual('certificate', {
  ref: 'Certificate',
  localField: '_id',
  foreignField: 'batchId',
  justOne: true,
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
