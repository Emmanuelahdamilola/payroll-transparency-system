import mongoose, { Schema, Document, Model } from 'mongoose';
import { UserRole, ActivityAction, ActivityStatus, EntityType } from '../types';

export interface IActivityLog extends Document {
  userId: string;
  role: UserRole;
  action: ActivityAction;
  entityType: EntityType;
  entityId?: string;
  metadata?: {
    before?: any;
    after?: any;
    [key: string]: any;
  };
  ip?: string;
  userAgent?: string;
  timestamp: Date;
  status: ActivityStatus;
  errorMessage?: string;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
      index: true
    },
    action: {
      type: String,
      enum: Object.values(ActivityAction),
      required: true,
      index: true
    },
    entityType: {
      type: String,
      enum: Object.values(EntityType),
      required: true,
      index: true
    },
    entityId: {
      type: String,
      index: true
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    ip: {
      type: String
    },
    userAgent: {
      type: String
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
      expires: 31536000 // Auto-delete after 1 year (in seconds)
    },
    status: {
      type: String,
      enum: Object.values(ActivityStatus),
      default: ActivityStatus.SUCCESS,
      index: true
    },
    errorMessage: {
      type: String
    }
  },
  {
    timestamps: false // Using custom timestamp field
  }
);

// Compound indexes for efficient queries
ActivityLogSchema.index({ userId: 1, timestamp: -1 });
ActivityLogSchema.index({ action: 1, timestamp: -1 });
ActivityLogSchema.index({ entityType: 1, entityId: 1 });
ActivityLogSchema.index({ status: 1, timestamp: -1 });
ActivityLogSchema.index({ role: 1, action: 1 });

const ActivityLog: Model<IActivityLog> = mongoose.model<IActivityLog>(
  'ActivityLog',
  ActivityLogSchema
);

export default ActivityLog;