import mongoose, { Schema, Document } from 'mongoose';
import { INotification } from '../types/index.js';

export interface INotificationDocument extends INotification, Document {
  id: string;
}

const notificationSchema = new Schema<INotificationDocument>(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      ref: 'User',
      index: true,
    },
    type: {
      type: String,
      enum: [
        'batch_submitted',
        'inspection_complete',
        'certificate_issued',
        'certificate_revoked',
        'action_required',
        'batch_approved',
        'batch_rejected',
      ],
      required: [true, 'Notification type is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    actionUrl: {
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
        const { _id, __v, ...notificationObj } = ret;
        return { ...notificationObj, id: _id.toString() };
      },
    },
  }
);

// Indexes for efficient querying
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ createdAt: -1 });

// TTL index to auto-delete read notifications after 90 days
notificationSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 90 * 24 * 60 * 60,
    partialFilterExpression: { read: true },
  }
);

// Virtual for user
notificationSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

// Static method to mark all as read for a user
notificationSchema.statics.markAllAsRead = async function (userId: string) {
  return this.updateMany({ userId, read: false }, { read: true });
};

export const Notification = mongoose.model<INotificationDocument>(
  'Notification',
  notificationSchema
);
