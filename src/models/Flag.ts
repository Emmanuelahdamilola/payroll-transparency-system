import mongoose, { Schema, Document, Model } from 'mongoose';
import { FlagType } from '../types';

export interface IFlag extends Document {
  payrollId: mongoose.Types.ObjectId; // Reference to PayrollBatch
  staffHash: string;
  type: FlagType;
  score: number; // Confidence score 0-1
  explanation: string;
  metadata?: Record<string, any>; // Additional context
  reviewed: boolean;
  reviewedBy?: mongoose.Types.ObjectId; // Reference to User
  reviewedAt?: Date;
  resolution?: 'confirmed' | 'false_positive' | 'pending';
  resolutionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FlagSchema = new Schema<IFlag>(
  {
    payrollId: {
      type: Schema.Types.ObjectId,
      ref: 'PayrollBatch',
      required: true,
      index: true
    },
    staffHash: {
      type: String,
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: Object.values(FlagType),
      required: true,
      index: true
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    },
    explanation: {
      type: String,
      required: true
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    reviewed: {
      type: Boolean,
      default: false,
      index: true
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: {
      type: Date
    },
    resolution: {
      type: String,
      enum: ['confirmed', 'false_positive', 'pending'],
      default: 'pending'
    },
    resolutionNotes: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for complex queries
FlagSchema.index({ payrollId: 1, type: 1 });
FlagSchema.index({ staffHash: 1, type: 1 });
FlagSchema.index({ reviewed: 1, createdAt: -1 });
FlagSchema.index({ type: 1, score: -1 });

const Flag: Model<IFlag> = mongoose.model<IFlag>('Flag', FlagSchema);
export default Flag;