import mongoose, { Schema, Document, Model } from 'mongoose';

// Payroll record within a batch
interface IPayrollRecord {
  staffHash: string;
  salary: number;
  status: 'pending' | 'verified' | 'flagged' | 'rejected';
  flags: mongoose.Types.ObjectId[]; // References to Flag documents
}

export interface IPayrollBatch extends Document {
  batchHash: string;
  uploadedBy: mongoose.Types.ObjectId; // Reference to User
  csvLink: string;
  uploadedAt: Date;
  payrollRecords: IPayrollRecord[];
  blockchainTx?: string;
  status: 'processing' | 'verified' | 'completed' | 'failed';
  totalAmount: number;
  totalStaff: number;
  flaggedCount: number;
  month: number;
  year: number;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollRecordSchema = new Schema<IPayrollRecord>(
  {
    staffHash: {
      type: String,
      required: true,
      index: true
    },
    salary: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'flagged', 'rejected'],
      default: 'pending'
    },
    flags: [{
      type: Schema.Types.ObjectId,
      ref: 'Flag'
    }]
  },
  { _id: false }
);

const PayrollBatchSchema = new Schema<IPayrollBatch>(
  {
    batchHash: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    csvLink: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    payrollRecords: [PayrollRecordSchema],
    blockchainTx: {
      type: String,
      index: true
    },
    status: {
      type: String,
      enum: ['processing', 'verified', 'completed', 'failed'],
      default: 'processing',
      index: true
    },
    totalAmount: {
      type: Number,
      default: 0
    },
    totalStaff: {
      type: Number,
      default: 0
    },
    flaggedCount: {
      type: Number,
      default: 0
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    year: {
      type: Number,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes for queries
PayrollBatchSchema.index({ month: 1, year: 1 });
PayrollBatchSchema.index({ status: 1, createdAt: -1 });
PayrollBatchSchema.index({ uploadedBy: 1, createdAt: -1 });

const PayrollBatch: Model<IPayrollBatch> = mongoose.model<IPayrollBatch>(
  'PayrollBatch',
  PayrollBatchSchema
);

export default PayrollBatch;