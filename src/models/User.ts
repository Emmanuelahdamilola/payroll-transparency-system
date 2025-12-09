
import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserRole, VALIDATION_RULES } from '../types';

// Interface for User document
export interface IUser extends Document {
  email: string;
  password: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLogin?: Date;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Interface for User Model with static methods
interface IUserModel extends Model<IUser> {
  findActive(): Promise<IUser[]>;
  findByRole(role: UserRole): Promise<IUser[]>;
}

// User Schema
const UserSchema = new Schema<IUser, IUserModel>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      maxlength: [255, 'Email must not exceed 255 characters']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [VALIDATION_RULES.PASSWORD_MIN_LENGTH, `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters`],
      maxlength: [VALIDATION_RULES.PASSWORD_MAX_LENGTH, `Password must not exceed ${VALIDATION_RULES.PASSWORD_MAX_LENGTH} characters`],
      select: false 
    },
    role: {
      type: String,
      enum: {
        values: Object.values(UserRole),
        message: '{VALUE} is not a valid role'
      },
      default: UserRole.AUDITOR,
      required: [true, 'Role is required']
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [VALIDATION_RULES.NAME_MIN_LENGTH, `First name must be at least ${VALIDATION_RULES.NAME_MIN_LENGTH} characters`],
      maxlength: [VALIDATION_RULES.NAME_MAX_LENGTH, `First name must not exceed ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`]
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [VALIDATION_RULES.NAME_MIN_LENGTH, `Last name must be at least ${VALIDATION_RULES.NAME_MIN_LENGTH} characters`],
      maxlength: [VALIDATION_RULES.NAME_MAX_LENGTH, `Last name must not exceed ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`]
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    lastLogin: {
      type: Date
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
      select: false
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(_doc, ret) {
        // Use Reflect.deleteProperty or check existence before deleting
        if ('password' in ret) {
          delete (ret as any).password;
        }
        if ('__v' in ret) {
          delete (ret as any).__v;
        }
        return ret;
      }
    }
  }
);

// Compound indexes for better query performance
// Email index is already created by unique: true in schema definition
UserSchema.index({ role: 1, isActive: 1 });
UserSchema.index({ createdAt: -1 });

// Hash password before saving
UserSchema.pre('save', async function() {
  // Only hash if password is modified
  if (!this.isModified('password')) {
    return;
  }
  
  // Use higher cost factor (12) for better security
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Remove the post save hook - it's unnecessary since we handle this in toJSON
// and the password field has select: false

// Method to compare passwords
UserSchema.methods.comparePassword = async function(
  candidatePassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
};

// Static method to find active users
UserSchema.statics.findActive = function(): Promise<IUser[]> {
  return this.find({ isActive: true }).select('-password');
};

// Static method to find users by role
UserSchema.statics.findByRole = function(role: UserRole): Promise<IUser[]> {
  return this.find({ role }).select('-password');
};

const User = mongoose.model<IUser, IUserModel>('User', UserSchema);

export default User;