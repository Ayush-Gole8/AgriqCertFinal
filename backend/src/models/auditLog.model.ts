import mongoose, { Schema, Document } from 'mongoose';
import { IAuditLog } from '../types/index.js';

export interface IAuditLogDocument extends IAuditLog, Document {
  id: string;
}

const auditLogSchema = new Schema<IAuditLogDocument>(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      ref: 'User',
      index: true,
    },
    userName: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
      index: true,
    },
    resource: {
      type: String,
      required: [true, 'Resource is required'],
      trim: true,
      index: true,
    },
    resourceId: {
      type: String,
      required: [true, 'Resource ID is required'],
      index: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret) {
        const { _id, __v, ...auditObj } = ret;
        void __v;
        return { ...auditObj, id: _id.toString() };
      },
    },
  }
);

// Indexes for efficient querying
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

// TTL index to auto-delete old logs after 2 years
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });

// Virtual for user
auditLogSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

export const AuditLog = mongoose.model<IAuditLogDocument>('AuditLog', auditLogSchema);
