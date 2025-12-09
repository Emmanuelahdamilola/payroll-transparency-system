// // src/routes/auditorRoutes.ts
// import { Router } from 'express';
// import {
//   authenticate,
//   requireAuditor,
//   checkPasswordChangeRequired
// } from '../middleware/auth';

// const router = Router();

// /**
//  * AUDITOR ONLY ROUTES
//  * These routes are exclusively for auditors
//  * Admins will receive 403 Forbidden if they try to access these routes
//  */

// /**
//  * Get auditor dashboard
//  * GET /api/auditor/dashboard
//  * Auth: Required (Auditor only)
//  */
// router.get(
//   '/dashboard',
//   authenticate,
//   checkPasswordChangeRequired,
//   requireAuditor,
//   (req, res) => {
//     res.json({
//       success: true,
//       message: 'Auditor dashboard accessed',
//       data: {
//         // Add auditor-specific dashboard data here
//         message: 'Welcome to the auditor dashboard'
//       }
//     });
//   }
// );

// /**
//  * Get audit reports
//  * GET /api/auditor/reports
//  * Auth: Required (Auditor only)
//  */
// router.get(
//   '/reports',
//   authenticate,
//   checkPasswordChangeRequired,
//   requireAuditor,
//   (req, res) => {
//     res.json({
//       success: true,
//       message: 'Audit reports retrieved',
//       data: {
//         reports: []
//       }
//     });
//   }
// );

// /**
//  * Submit audit finding
//  * POST /api/auditor/findings
//  * Auth: Required (Auditor only)
//  */
// router.post(
//   '/findings',
//   authenticate,
//   checkPasswordChangeRequired,
//   requireAuditor,
//   (req, res) => {
//     res.json({
//       success: true,
//       message: 'Audit finding submitted',
//       data: req.body
//     });
//   }
// );

// export default router;



// src/controllers/authController.ts
import { Request, Response } from "express";
import User from "../models/User";
import { generateToken } from "../utils/auth";
import { UserRole, VALIDATION_RULES } from "../types";
import { AuthRequest } from '../types';
import crypto from 'crypto';

// Cookie configuration
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
});

/**
 * Validate password strength
 */
const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters long`);
  }

  if (password.length > VALIDATION_RULES.PASSWORD_MAX_LENGTH) {
    errors.push(`Password must not exceed ${VALIDATION_RULES.PASSWORD_MAX_LENGTH} characters`);
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Generate secure temporary password
 * Uses crypto for cryptographically secure random generation
 */
const generateTemporaryPassword = (): string => {
  const length = 16; // Increased from 12 for better security
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  
  // Ensure at least one character from each category
  let password = '';
  password += lowercase[crypto.randomInt(0, lowercase.length)];
  password += uppercase[crypto.randomInt(0, uppercase.length)];
  password += numbers[crypto.randomInt(0, numbers.length)];
  password += special[crypto.randomInt(0, special.length)];
  
  // Fill the rest randomly
  const allChars = lowercase + uppercase + numbers + special;
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(0, allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Validate name field
 */
const validateName = (name: string, fieldName: string): { isValid: boolean; error?: string } => {
  const trimmed = name.trim();
  
  if (trimmed.length < VALIDATION_RULES.NAME_MIN_LENGTH) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${VALIDATION_RULES.NAME_MIN_LENGTH} characters`
    };
  }
  
  if (trimmed.length > VALIDATION_RULES.NAME_MAX_LENGTH) {
    return {
      isValid: false,
      error: `${fieldName} must not exceed ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`
    };
  }
  
  if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
    return {
      isValid: false,
      error: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`
    };
  }
  
  return { isValid: true };
};

/**
 * Register a new user (admin only - auditors cannot self-register)
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({
        success: false,
        error: "Missing required fields (email, password, firstName, lastName)",
      });
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        success: false,
        error: "Password does not meet security requirements",
        details: passwordValidation.errors
      });
      return;
    }

    // Validate names
    const firstNameValidation = validateName(firstName, 'First name');
    if (!firstNameValidation.isValid) {
      res.status(400).json({
        success: false,
        error: firstNameValidation.error
      });
      return;
    }

    const lastNameValidation = validateName(lastName, 'Last name');
    if (!lastNameValidation.isValid) {
      res.status(400).json({
        success: false,
        error: lastNameValidation.error
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      res.status(400).json({
        success: false,
        error: "Please provide a valid email address",
      });
      return;
    }

    // Check for existing user
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(400).json({
        success: false,
        error: "User with this email already exists",
      });
      return;
    }

    // Only allow admin role for self-registration
    const userRole = role || UserRole.ADMIN;
    if (userRole !== UserRole.ADMIN) {
      res.status(400).json({
        success: false,
        error: "Only admin accounts can self-register. Auditors must be created by an admin.",
      });
      return;
    }

    // Create admin user (password will be hashed by pre-save hook)
    const user = await User.create({
      email: normalizedEmail,
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: UserRole.ADMIN,
      isActive: true,
      mustChangePassword: false // Self-registered admins don't need to change password
    });

    // Generate JWT token
    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Set authentication cookie
    res.cookie("token", token, getCookieOptions());

    res.status(201).json({
      success: true,
      message: "Admin account registered successfully",
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      error: "Registration failed",
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: "Please provide email and password",
      });
      return;
    }

    // Find user and explicitly select password and mustChangePassword fields
    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select("+password +mustChangePassword");

    if (!user) {
      res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
      return;
    }

    // Check if account is active
    if (!user.isActive) {
      res.status(403).json({
        success: false,
        error: "Account is deactivated. Contact administrator.",
      });
      return;
    }

    // Verify password using model method
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
      return;
    }

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Set authentication cookie
    res.cookie("token", token, getCookieOptions());

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          lastLogin: user.lastLogin,
          mustChangePassword: user.mustChangePassword // Critical: Include this flag
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      error: "Login failed",
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Logout - Clear authentication cookie
 * POST /api/auth/logout
 */
export const logout = (req: Request, res: Response): void => {
  res.clearCookie("token", getCookieOptions());

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
    timestamp: new Date().toISOString(),
  });
};

/**
 * Get current user profile
 * GET /api/auth/profile
 */
export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const user = await User.findById(userId).select('+mustChangePassword');

    if (!user) {
      res.status(404).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get profile",
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Create auditor account (Admin only)
 * POST /api/auth/create-auditor
 */
export const createAuditor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, firstName, lastName } = req.body;

    // Validation
    if (!email || !firstName || !lastName) {
      res.status(400).json({
        success: false,
        error: "Missing required fields (email, firstName, lastName)",
      });
      return;
    }

    // Validate names
    const firstNameValidation = validateName(firstName, 'First name');
    if (!firstNameValidation.isValid) {
      res.status(400).json({
        success: false,
        error: firstNameValidation.error
      });
      return;
    }

    const lastNameValidation = validateName(lastName, 'Last name');
    if (!lastNameValidation.isValid) {
      res.status(400).json({
        success: false,
        error: lastNameValidation.error
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      res.status(400).json({
        success: false,
        error: "Please provide a valid email address",
      });
      return;
    }

    // Check for existing user
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(400).json({
        success: false,
        error: "User with this email already exists",
      });
      return;
    }

    // Generate cryptographically secure temporary password
    const temporaryPassword = generateTemporaryPassword();

    // Create auditor (password will be hashed by pre-save hook)
    const auditor = await User.create({
      email: normalizedEmail,
      password: temporaryPassword,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: UserRole.AUDITOR,
      isActive: true,
      mustChangePassword: true // Force password change on first login
    });

    res.status(201).json({
      success: true,
      message: "Auditor account created successfully",
      data: {
        user: {
          id: auditor._id,
          email: auditor.email,
          firstName: auditor.firstName,
          lastName: auditor.lastName,
          role: auditor.role,
          isActive: auditor.isActive,
          mustChangePassword: true,
        },
        temporaryPassword, // Return this for admin to share with auditor
        note: "User must change password on first login"
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Create auditor error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create auditor",
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Update user profile (name and/or password)
 * PUT /api/auth/update-profile
 */
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { firstName, lastName, currentPassword, newPassword } = req.body;

    // Find user with password field
    const user = await User.findById(userId).select('+password +mustChangePassword');

    if (!user) {
      res.status(404).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    // If user has mustChangePassword flag, they must use force-change-password endpoint
    if (user.mustChangePassword && newPassword) {
      res.status(400).json({
        success: false,
        error: "Please use /api/auth/force-change-password endpoint for your first password change",
      });
      return;
    }

    // Track if any changes were made
    let updated = false;

    // Update name fields if provided
    if (firstName) {
      const validation = validateName(firstName, 'First name');
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: validation.error
        });
        return;
      }
      
      if (firstName.trim() !== user.firstName) {
        user.firstName = firstName.trim();
        updated = true;
      }
    }
    
    if (lastName) {
      const validation = validateName(lastName, 'Last name');
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: validation.error
        });
        return;
      }
      
      if (lastName.trim() !== user.lastName) {
        user.lastName = lastName.trim();
        updated = true;
      }
    }

    // Update password if provided
    if (newPassword) {
      if (!currentPassword) {
        res.status(400).json({
          success: false,
          error: "Current password is required to set new password",
        });
        return;
      }

      // Validate new password strength
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        res.status(400).json({
          success: false,
          error: "New password does not meet security requirements",
          details: passwordValidation.errors
        });
        return;
      }

      // Verify current password
      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          error: "Current password is incorrect",
        });
        return;
      }

      // Ensure new password is different
      if (currentPassword === newPassword) {
        res.status(400).json({
          success: false,
          error: "New password must be different from current password",
        });
        return;
      }

      // Set new password (will be hashed by pre-save hook)
      user.password = newPassword;
      updated = true;
    }

    if (!updated) {
      res.status(400).json({
        success: false,
        error: "No changes provided",
      });
      return;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update profile",
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Force password change (for auditors with temporary passwords only)
 * PUT /api/auth/force-change-password
 */
export const forceChangePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: "Both current and new passwords are required",
      });
      return;
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        success: false,
        error: "New password does not meet security requirements",
        details: passwordValidation.errors
      });
      return;
    }

    // Ensure new password is different from current
    if (currentPassword === newPassword) {
      res.status(400).json({
        success: false,
        error: "New password must be different from current password",
      });
      return;
    }

    // Find user with password field
    const user = await User.findById(userId).select('+password +mustChangePassword');

    if (!user) {
      res.status(404).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    // Only users with mustChangePassword flag should use this endpoint
    if (!user.mustChangePassword) {
      res.status(400).json({
        success: false,
        error: "You don't need to force change your password. Use /api/auth/update-profile instead.",
      });
      return;
    }

    // Additional check: Only auditors should have mustChangePassword flag
    if (user.role !== UserRole.AUDITOR) {
      res.status(403).json({
        success: false,
        error: "This endpoint is only for auditors with temporary passwords",
      });
      return;
    }

    // Verify current (temporary) password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: "Current password is incorrect",
      });
      return;
    }

    // Set new password (will be hashed by pre-save hook)
    user.password = newPassword;
    
    // Clear the mustChangePassword flag
    user.mustChangePassword = false;
    
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully. You now have full access to the system.",
      data: {
        mustChangePassword: false,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Force change password error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to change password",
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * List all users (Admin only)
 * GET /api/auth/users
 */
export const listUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      VALIDATION_RULES.PAGINATION_MAX_LIMIT,
      Math.max(1, parseInt(req.query.limit as string) || VALIDATION_RULES.PAGINATION_DEFAULT_LIMIT)
    );
    const role = req.query.role as string;
    const search = req.query.search as string;
    const isActive = req.query.isActive as string;

    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};
    
    // Filter by role if provided and valid
    if (role && Object.values(UserRole).includes(role as UserRole)) {
      query.role = role;
    }
    
    // Filter by active status if provided
    if (isActive !== undefined && (isActive === 'true' || isActive === 'false')) {
      query.isActive = isActive === 'true';
    }
    
    // Search by name or email if provided
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex }
      ];
    }

    // Fetch users
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query)
    ]);

    const pages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages,
          hasMore: page < pages
        }
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("List users error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to list users",
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Toggle user active status (Admin only)
 * PATCH /api/auth/users/:id/status
 */
export const toggleUserStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    // Validation
    if (typeof isActive !== 'boolean') {
      res.status(400).json({
        success: false,
        error: 'isActive must be a boolean value'
      });
      return;
    }

    // Prevent admin from deactivating themselves
    if (id === req.user!.id) {
      res.status(400).json({
        success: false,
        error: 'You cannot change your own account status'
      });
      return;
    }

    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    // Update status
    user.isActive = isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Toggle user status error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update user status",
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Delete user account (Admin only)
 * DELETE /api/auth/users/:id
 */
export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user!.id) {
      res.status(400).json({
        success: false,
        error: 'You cannot delete your own account'
      });
      return;
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete user",
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};