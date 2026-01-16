import mongoose, { Schema, Document } from 'mongoose';

export interface IRevocation {
  certificateId: string;
  providerVcId?: string;
  vcHash?: string;
  revokedBy: string;
  reason: string;
  revokedAt: Date;
  metadata?: Record<string, any>;
}

export interface IRevocationDocument extends IRevocation, Document {
  id: string;
}

const revocationSchema = new Schema<IRevocationDocument>(
  {
    certificateId: {
      type: String,
      required: [true, 'Certificate ID is required'],
      ref: 'Certificate',
      index: true,
    },
    providerVcId: {
      type: String,
      trim: true,
      index: true,
      sparse: true, // Allow null values
    },
    vcHash: {
      type: String,
      trim: true,
      index: true,
      sparse: true, // Allow null values
    },
    revokedBy: {
      type: String,
      required: [true, 'Revoker ID is required'],
      ref: 'User',
      index: true,
    },
    reason: {
      type: String,
      required: [true, 'Revocation reason is required'],
      trim: true,
      maxlength: [500, 'Revocation reason cannot exceed 500 characters'],
      enum: {
        values: [
          'compromised_key',
          'cessation_of_operation',
          'affiliation_changed',
          'superseded',
          'fraud',
          'quality_issue',
          'expired_inspection',
          'administrative',
          'other'
        ],
        message: 'Invalid revocation reason'
      },
    },
    revokedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
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
        ret.id = ret._id?.toString();
        const result = { ...ret };
        delete (result as any)._id;
        delete (result as any).__v;
        return result;
      },
    },
  }
);

// Compound indexes for efficient queries
revocationSchema.index({ certificateId: 1, revokedAt: -1 });
revocationSchema.index({ vcHash: 1, revokedAt: -1 });
revocationSchema.index({ providerVcId: 1, revokedAt: -1 });
revocationSchema.index({ revokedBy: 1, revokedAt: -1 });

// TTL index to maintain audit trail for 7 years (regulatory compliance)
revocationSchema.index({ revokedAt: 1 }, { expireAfterSeconds: 7 * 365 * 24 * 60 * 60 });

// Static methods
revocationSchema.statics.isRevoked = function(vcHash?: string, providerVcId?: string, certificateId?: string) {
  const query: Record<string, any> = {};
  
  if (vcHash) {
    query.vcHash = vcHash;
  } else if (providerVcId) {
    query.providerVcId = providerVcId;
  } else if (certificateId) {
    query.certificateId = certificateId;
  } else {
    throw new Error('At least one identifier must be provided');
  }

  return this.findOne(query).sort({ revokedAt: -1 });
};

revocationSchema.statics.getRevokedCertificates = function(limit = 100, skip = 0) {
  return this.find({})
    .sort({ revokedAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('revokedBy', 'name email role')
    .populate('certificateId', 'batchId');
};

revocationSchema.statics.getRevocationsByUser = function(userId: string) {
  return this.find({ revokedBy: userId })
    .sort({ revokedAt: -1 })
    .populate('certificateId', 'batchId');
};

// Instance methods
revocationSchema.methods.getDisplayReason = function(): string {
  const reasonMap: Record<string, string> = {
    'compromised_key': 'Compromised Key',
    'cessation_of_operation': 'Cessation of Operation',
    'affiliation_changed': 'Affiliation Changed',
    'superseded': 'Superseded',
    'fraud': 'Fraud Detected',
    'quality_issue': 'Quality Issue',
    'expired_inspection': 'Expired Inspection',
    'administrative': 'Administrative',
    'other': 'Other'
  };
  
  return reasonMap[this.reason] || this.reason;
};

// Virtual for age calculation
revocationSchema.virtual('daysRevoked').get(function() {
  return Math.floor((Date.now() - this.revokedAt.getTime()) / (1000 * 60 * 60 * 24));
});

// Pre-save validation
revocationSchema.pre('save', function(next) {
  // Ensure at least one identifier is present
  if (!this.certificateId && !this.vcHash && !this.providerVcId) {
    next(new Error('At least one of certificateId, vcHash, or providerVcId must be provided'));
    return;
  }
  
  next();
});

export const Revocation = mongoose.model<IRevocationDocument>('Revocation', revocationSchema);