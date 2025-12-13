import mongoose, { Schema, Document } from 'mongoose';

export interface IIssuanceJob {
  batchId: string;
  inspectionId?: string;
  certificateId?: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  attempts: number;
  attemptCount: number;
  maxAttempts: number;
  workerId?: string;
  lastError?: string;
  payload?: Record<string, any>;
  result?: {
    vcId: string;
    vcUrl: string;
    certificateId: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IIssuanceJobDocument extends IIssuanceJob, Document {
  id: string;
}

const issuanceJobSchema = new Schema<IIssuanceJobDocument>(
  {
    batchId: {
      type: String,
      required: [true, 'Batch ID is required'],
      ref: 'Batch',
      index: true,
    },
    inspectionId: {
      type: String,
      ref: 'Inspection',
      index: true,
    },
    certificateId: {
      type: String,
      ref: 'Certificate',
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'success', 'failed'],
      default: 'pending',
      required: true,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: [0, 'Attempt count cannot be negative'],
      max: [10, 'Maximum 10 attempts allowed'],
    },
    attemptCount: {
      type: Number,
      default: 0,
      min: [0, 'Attempt count cannot be negative'],
      max: [10, 'Maximum 10 attempts allowed'],
    },
    maxAttempts: {
      type: Number,
      default: 3,
      min: [1, 'Must allow at least 1 attempt'],
      max: [10, 'Maximum 10 attempts allowed'],
    },
    workerId: {
      type: String,
      trim: true,
    },
    lastError: {
      type: String,
      trim: true,
      maxlength: [1000, 'Error message cannot exceed 1000 characters'],
    },
    payload: {
      type: Schema.Types.Mixed,
      default: {},
    },
    result: {
      vcId: {
        type: String,
        trim: true,
      },
      vcUrl: {
        type: String,
        trim: true,
      },
      certificateId: {
        type: String,
        trim: true,
      },
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

// Indexes for efficient querying
issuanceJobSchema.index({ status: 1, createdAt: 1 });
issuanceJobSchema.index({ batchId: 1, status: 1 });
issuanceJobSchema.index({ status: 1, attempts: 1, createdAt: 1 });

// TTL index to clean up old jobs (30 days)
issuanceJobSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Static methods
issuanceJobSchema.statics.findPendingJobs = function(limit = 10) {
  return this.find({ 
    status: 'pending',
    $expr: { $lt: ['$attempts', '$maxAttempts'] }
  })
  .sort({ createdAt: 1 })
  .limit(limit);
};

issuanceJobSchema.statics.claimJob = function(jobId: string, workerId: string) {
  return this.findOneAndUpdate(
    { 
      _id: jobId, 
      status: 'pending' 
    },
    { 
      status: 'processing',
      workerId,
      $inc: { attempts: 1 }
    },
    { new: true }
  );
};

issuanceJobSchema.statics.markSuccess = function(jobId: string, result: any) {
  return this.findByIdAndUpdate(
    jobId,
    { 
      status: 'success',
      result,
      lastError: undefined
    },
    { new: true }
  );
};

issuanceJobSchema.statics.markFailed = function(jobId: string, error: string) {
  return this.findOneAndUpdate(
    { _id: jobId },
    [
      {
        $set: {
          status: {
            $cond: {
              if: { $gte: ['$attempts', '$maxAttempts'] },
              then: 'failed',
              else: 'pending'
            }
          },
          lastError: error,
          workerId: null
        }
      }
    ],
    { new: true }
  );
};

issuanceJobSchema.statics.requeueJob = function(jobId: string, error?: string) {
  return this.findByIdAndUpdate(
    jobId,
    { 
      status: 'pending',
      lastError: error
    },
    { new: true }
  );
};

// Instance methods
issuanceJobSchema.methods.canRetry = function(): boolean {
  return this.attempts < 3 && this.status === 'failed';
};

issuanceJobSchema.methods.retry = function(): Promise<IIssuanceJobDocument> {
  if (!this.canRetry()) {
    throw new Error('Job cannot be retried');
  }
  
  this.status = 'pending';
  return this.save();
};

// Pre-save middleware
issuanceJobSchema.pre('save', function(next) {
  // Auto-fail jobs with too many attempts
  if (this.attempts >= 3 && this.status !== 'failed') {
    this.status = 'failed';
    if (!this.lastError) {
      this.lastError = 'Maximum retry attempts exceeded';
    }
  }
  next();
});

// Virtual for age calculation
issuanceJobSchema.virtual('ageMinutes').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60));
});

// Virtual for status display
issuanceJobSchema.virtual('statusDisplay').get(function() {
  switch (this.status) {
    case 'pending': return 'Queued';
    case 'processing': return 'Processing';
    case 'success': return 'Completed';
    case 'failed': return 'Failed';
    default: return this.status;
  }
});

export const IssuanceJob = mongoose.model<IIssuanceJobDocument>('IssuanceJob', issuanceJobSchema);