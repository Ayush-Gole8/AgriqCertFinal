import mongoose, { Schema, Document } from 'mongoose';

/**
 * Webhook Log Interface
 * Tracks all incoming webhook events from Inji
 */
export interface IWebhookLog extends Document {
  webhookId: string;
  eventType: string;
  payload: Record<string, unknown>;
  signature: string;
  timestamp: Date;
  processed: boolean;
  processedAt?: Date;
  error?: string;
  retryCount: number;
  ipAddress?: string;
  userAgent?: string;
  processingDuration?: number;
  createdAt: Date;
  updatedAt: Date;
}

const webhookLogSchema = new Schema<IWebhookLog>(
  {
    webhookId: {
      type: String,
      required: [true, 'Webhook ID is required'],
      unique: true,
      index: true,
      trim: true,
    },
    eventType: {
      type: String,
      required: [true, 'Event type is required'],
      index: true,
      trim: true,
      enum: [
        'credential.issued',
        'credential.verified',
        'credential.revoked',
        'credential.expired',
        'wallet.credential_received',
        'wallet.credential_deleted',
        'issuance.failed',
        'verification.failed',
        'unknown',
      ],
    },
    payload: {
      type: Schema.Types.Mixed,
      required: [true, 'Payload is required'],
    },
    signature: {
      type: String,
      required: [true, 'Signature is required'],
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    processed: {
      type: Boolean,
      default: false,
      index: true,
    },
    processedAt: {
      type: Date,
      index: true,
    },
    error: {
      type: String,
      trim: true,
      maxlength: [2000, 'Error message cannot exceed 2000 characters'],
    },
    retryCount: {
      type: Number,
      default: 0,
      min: [0, 'Retry count cannot be negative'],
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    processingDuration: {
      type: Number,
      min: [0, 'Processing duration cannot be negative'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret: Record<string, unknown>) {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for efficient querying
webhookLogSchema.index({ webhookId: 1 }, { unique: true });
webhookLogSchema.index({ eventType: 1, processed: 1 });
webhookLogSchema.index({ timestamp: 1 });
webhookLogSchema.index({ createdAt: 1 });

// Compound index for retry queries
webhookLogSchema.index({ processed: 1, retryCount: 1, createdAt: 1 });

// TTL index - automatically delete logs after 90 days
webhookLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Virtual for ID
webhookLogSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Method to mark as processed
webhookLogSchema.methods.markAsProcessed = async function (
  duration?: number
): Promise<void> {
  this.processed = true;
  this.processedAt = new Date();
  if (duration !== undefined) {
    this.processingDuration = duration;
  }
  await this.save();
};

// Method to increment retry count
webhookLogSchema.methods.incrementRetry = async function (error?: string): Promise<void> {
  this.retryCount += 1;
  if (error) {
    this.error = error;
  }
  await this.save();
};

// Static method to check for duplicates
webhookLogSchema.statics.isDuplicate = async function (
  webhookId: string
): Promise<boolean> {
  const count = await this.countDocuments({ webhookId });
  return count > 0;
};

// Static method to get unprocessed webhooks for retry
webhookLogSchema.statics.getUnprocessed = async function (
  maxRetries: number = 3
): Promise<IWebhookLog[]> {
  return this.find({
    processed: false,
    retryCount: { $lt: maxRetries },
  })
    .sort({ createdAt: 1 })
    .limit(100);
};

// Static method to get webhook statistics
webhookLogSchema.statics.getStats = async function (
  startDate?: Date,
  endDate?: Date
): Promise<Array<{
  _id: string;
  total: number;
  processed: number;
  failed: number;
  avgProcessingTime: number;
}>> {
  const match: Record<string, unknown> = {};
  if (startDate) match.createdAt = { $gte: startDate };
  if (endDate) {
    match.createdAt = { 
      ...(match.createdAt as Record<string, unknown> || {}), 
      $lte: endDate 
    };
  }

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$eventType',
        total: { $sum: 1 },
        processed: { $sum: { $cond: ['$processed', 1, 0] } },
        failed: { $sum: { $cond: [{ $gt: ['$retryCount', 0] }, 1, 0] } },
        avgProcessingTime: { $avg: '$processingDuration' },
      },
    },
    { $sort: { total: -1 } },
  ]);

  return stats;
};

export const WebhookLog = mongoose.model<IWebhookLog>('WebhookLog', webhookLogSchema);
