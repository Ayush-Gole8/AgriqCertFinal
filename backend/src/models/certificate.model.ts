import mongoose, { Schema, Document } from 'mongoose';
import { ICertificate, IVerifiableCredential } from '../types/index.js';

export interface ICertificateDocument extends ICertificate, Document {
  id: string;
}

const verifiableCredentialSchema = new Schema<IVerifiableCredential>(
  {
    '@context': {
      type: [String],
      required: true,
      default: ['https://www.w3.org/2018/credentials/v1'],
    },
    type: {
      type: [String],
      required: true,
      default: ['VerifiableCredential', 'AgricultureQualityCertificate'],
    },
    issuer: {
      type: String,
      required: [true, 'Issuer is required'],
    },
    issuanceDate: {
      type: String,
      required: [true, 'Issuance date is required'],
    },
    expirationDate: {
      type: String,
    },
    credentialSubject: {
      type: Schema.Types.Mixed,
      required: [true, 'Credential subject is required'],
    },
    proof: {
      type: Schema.Types.Mixed,
    },
  },
  { _id: false }
);

const certificateSchema = new Schema<ICertificateDocument>(
  {
    batchId: {
      type: String,
      required: [true, 'Batch ID is required'],
      ref: 'Batch',
      unique: true,
      index: true,
    },
    vc: {
      type: verifiableCredentialSchema,
      required: [true, 'Verifiable Credential is required'],
    },
    // Inji provider integration fields
    providerVcId: {
      type: String,
      index: true,
      sparse: true, // Allow null values
    },
    vcUrl: {
      type: String,
      trim: true,
    },
    vcHash: {
      type: String,
      index: true,
      sparse: true, // Allow null values, useful for migration
    },
    qrCodeData: {
      type: String,
      required: [true, 'QR code data is required'],
    },
    qrCodeImage: {
      type: String,
    },
    status: {
      type: String,
      enum: ['active', 'revoked', 'expired'],
      default: 'active',
      index: true,
    },
    revoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    issuedBy: {
      type: String,
      required: [true, 'Issuer ID is required'],
      ref: 'User',
      index: true,
    },
    issuedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    revokedAt: {
      type: Date,
    },
    revokedBy: {
      type: String,
      ref: 'User',
    },
    revocationReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Revocation reason cannot exceed 500 characters'],
    },
    // Provider metadata
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
        ret.id = ret._id?.toString();
        const result = { ...ret };
        delete (result as any)._id;
        delete (result as any).__v;
        return result;
      },
    },
    toObject: {
      virtuals: true,
    },
  }
);

// Indexes for efficient querying
certificateSchema.index({ batchId: 1 });
certificateSchema.index({ status: 1, issuedAt: -1 });
certificateSchema.index({ issuedBy: 1, issuedAt: -1 });
certificateSchema.index({ expiresAt: 1 });
certificateSchema.index({ qrCodeData: 1 });
certificateSchema.index({ createdAt: -1 });

// Pre-save middleware to check expiration
certificateSchema.pre('save', function (next) {
  if (this.expiresAt && this.expiresAt < new Date() && this.status === 'active') {
    this.status = 'expired';
  }
  next();
});

// Method to check if certificate is valid
certificateSchema.methods.isValid = function (): boolean {
  if (this.status === 'revoked') return false;
  if (this.expiresAt && this.expiresAt < new Date()) {
    this.status = 'expired';
    return false;
  }
  return this.status === 'active';
};

// Virtual for batch
certificateSchema.virtual('batch', {
  ref: 'Batch',
  localField: 'batchId',
  foreignField: '_id',
  justOne: true,
});

// Virtual for issuer
certificateSchema.virtual('issuer', {
  ref: 'User',
  localField: 'issuedBy',
  foreignField: '_id',
  justOne: true,
});

// Static method to find by QR code
certificateSchema.statics.findByQRCode = async function (qrCodeData: string) {
  return this.findOne({ qrCodeData, status: { $ne: 'revoked' } });
};

export const Certificate = mongoose.model<ICertificateDocument>('Certificate', certificateSchema);
