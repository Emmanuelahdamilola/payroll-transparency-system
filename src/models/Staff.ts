
// import mongoose, { Schema, Document, Model } from 'mongoose';

// export interface IStaff extends Document {
//   // Encrypted/hashed PII - never store plaintext
//   nameEncrypted: string;
//   dobEncrypted: string;
  
//   // Individual field hashes
//   bvnHash: string;
//   ninHash: string;
//   phoneHash: string;
  
//   // Composite staff hash (deterministic identifier)
//   staffHash: string;
  
  
//   // Work information
//   grade: string;
//   department: string;
  
//   // Status
//   isActive: boolean; 
  
//   // Blockchain verification
//   blockchainTxs: string[];
//   verified: boolean;
  
//   // Timestamps
//   createdAt: Date;
//   updatedAt: Date;
// }

// const StaffSchema = new Schema<IStaff>(
//   {
//     // Encrypted fields (we'll encrypt before saving)
//     nameEncrypted: {
//       type: String,
//       required: true
//     },
//     dobEncrypted: {
//       type: String,
//       required: true
//     },
    
//     // Hashed individual fields
//     bvnHash: {
//       type: String,
//       required: true,
//       index: true
//     },
//     ninHash: {
//       type: String,
//       required: true,
//       index: true
//     },
//     phoneHash: {
//       type: String,
//       required: true,
//       index: true
//     },
    
//     // Composite hash - main identifier
//     staffHash: {
//       type: String,
//       required: true,
//       unique: true,
//       index: true
//     },
    
//     // Work details
//     grade: {
//       type: String,
//       required: true,
//       index: true
//     },
//     department: {
//       type: String,
//       required: true,
//       index: true
//     },
    
//     // Status 
//     isActive: {
//       type: Boolean,
//       default: true,
//       index: true
//     },
    
//     // Blockchain tracking
//     blockchainTxs: [{
//       type: String
//     }],
//     verified: {
//       type: Boolean,
//       default: false,
//       index: true
//     }
//   },
//   {
//     timestamps: true
//   }
// );

// // Compound indexes for complex queries
// StaffSchema.index({ staffHash: 1, verified: 1 });
// StaffSchema.index({ grade: 1, department: 1 });
// StaffSchema.index({ isActive: 1, createdAt: -1 }); 
// StaffSchema.index({ createdAt: -1 });

// const Staff: Model<IStaff> = mongoose.model<IStaff>('Staff', StaffSchema);
// export default Staff;


import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStaff extends Document {
  // Encrypted PII - never store plaintext
  nameEncrypted: string;
  dobEncrypted: string;
  emailEncrypted?: string;
  
  // Individual field hashes
  bvnHash: string;
  ninHash: string;
  phoneHash: string;
  
  // Composite staff hash (deterministic identifier)
  staffHash: string;
  
  // Work information
  staffId?: string; 
  grade: string;
  department: string;
  position?: string; 
  
  // Employment details
  employmentType?: 'permanent' | 'contract' | 'temporary';
  hireDate?: Date; 
  
  // Bank details (for payroll)
  bankAccountEncrypted?: string; 
  bankNameEncrypted?: string;
  // Status
  isActive: boolean;
  
  // Blockchain verification
  blockchainTxs: string[];
  verified: boolean;
  
  // Audit trail
  createdBy?: mongoose.Types.ObjectId; 
  updatedBy?: mongoose.Types.ObjectId; 
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const StaffSchema = new Schema<IStaff>(
  {
    // Encrypted fields
    nameEncrypted: {
      type: String,
      required: true
    },
    dobEncrypted: {
      type: String,
      required: true
    },
    emailEncrypted: {
      type: String,
      required: false
    },
    
    // Hashed individual fields
    bvnHash: {
      type: String,
      required: true,
      index: true
    },
    ninHash: {
      type: String,
      required: true,
      index: true
    },
    phoneHash: {
      type: String,
      required: true,
      index: true
    },
    
    // Composite hash - main identifier
    staffHash: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    
    // Work details
    staffId: {
      type: String,
      unique: true,
      sparse: true, 
      index: true
    },
    grade: {
      type: String,
      required: true,
      index: true
    },
    department: {
      type: String,
      required: true,
      index: true
    },
    position: {
      type: String
    },
    
    // Employment details
    employmentType: {
      type: String,
      enum: ['permanent', 'contract', 'temporary'],
      default: 'permanent'
    },
    hireDate: {
      type: Date
    },
    
    // Bank details (encrypted)
    bankAccountEncrypted: {
      type: String
    },
    bankNameEncrypted: {
      type: String
    },
    
    // Status
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    
    // Blockchain tracking
    blockchainTxs: [{
      type: String
    }],
    verified: {
      type: Boolean,
      default: false,
      index: true
    },
    
    // Audit trail
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for complex queries
StaffSchema.index({ staffHash: 1, verified: 1 });
StaffSchema.index({ grade: 1, department: 1 });
StaffSchema.index({ isActive: 1, createdAt: -1 });
StaffSchema.index({ createdAt: -1 });
StaffSchema.index({ staffId: 1 }, { unique: true, sparse: true });

const Staff: Model<IStaff> = mongoose.model<IStaff>('Staff', StaffSchema);
export default Staff;
