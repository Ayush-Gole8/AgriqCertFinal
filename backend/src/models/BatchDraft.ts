import mongoose, { Schema, Document } from 'mongoose';
import { IBatchDraft } from '../types/index.js';

export interface IBatchDraftDocument extends IBatchDraft, Document {
  id: string;
}

const batchDraftSchema = new Schema<IBatchDraftDocument>(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      ref: 'User',
      index: true,
    },
    data: {
      type: Schema.Types.Mixed,
      required: [true, 'Draft data is required'],
      default: {},
    },
    step: {
      type: Number,
      required: [true, 'Current step is required'],
      min: [0, 'Step must be non-negative'],
      default: 0,
    },
    lastSavedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
      default: function () {
        // Drafts expire after 30 days
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date;
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret) {
        ret.id = ret._id.toString();
        const r: any = ret;
        delete r._id;
        delete r.__v;
        return r;
      },
    },
  }
);

// Indexes
batchDraftSchema.index({ userId: 1, updatedAt: -1 });
batchDraftSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-deletion

// Pre-save middleware to update lastSavedAt
batchDraftSchema.pre('save', function (next) {
  this.lastSavedAt = new Date();
  next();
});

export const BatchDraft = mongoose.model<IBatchDraftDocument>('BatchDraft', batchDraftSchema);
