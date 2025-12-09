// src/controllers/authController.ts
import { Request, Response } from "express";
import User from "../models/User";
import { generateToken } from "../utils/auth";
import { UserRole } from "../types";
import { AuthRequest } from '../types';
import crypto from 'crypto';



// Cookie configuration
const getCookieOptions = () => ({
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 7 * 24 * 60 * 60 * 1000, 
  path: "/",
});

/**
 * Generate secure temporary password
 * Uses crypto for cryptographically secure random generation
 */
const generateTemporaryPassword = (): string => {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  return password;
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

    // Password strength validation
    if (password.length < 8) {
      res.status(400).json({
        success: false,
        error: "Password must be at least 8 characters long",
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Email format validation
    const emailRegex = /^\S+@\S+\.\S+$/;
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
// export const login = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { email, password } = req.body;

//     // Validation
//     if (!email || !password) {
//       res.status(400).json({
//         success: false,
//         error: "Please provide email and password",
//       });
//       return;
//     }

//     // Find user and explicitly select password and mustChangePassword fields
//     const user = await User.findOne({ email: email.toLowerCase().trim() })
//       .select("+password");

//     if (!user) {
//       res.status(401).json({
//         success: false,
//         error: "Invalid credentials",
//       });
//       return;
//     }

//     // Check if account is active
//     if (!user.isActive) {
//       res.status(403).json({
//         success: false,
//         error: "Account is deactivated. Contact administrator.",
//       });
//       return;
//     }

//     // Verify password using model method
//     const isPasswordValid = await user.comparePassword(password);

//     if (!isPasswordValid) {
//       res.status(401).json({
//         success: false,
//         error: "Invalid credentials",
//       });
//       return;
//     }

//     // Update last login timestamp
//     user.lastLogin = new Date();
//     await user.save();

//     // Generate JWT token
//     const token = generateToken({
//       id: user._id.toString(),
//       email: user.email,
//       role: user.role,
//     });

//     // Set authentication cookie
//     res.cookie("token", token, getCookieOptions());

//     res.status(200).json({
//       success: true,
//       message: "Login successful",
//       data: {
//         user: {
//           id: user._id,
//           email: user.email,
//           firstName: user.firstName,
//           lastName: user.lastName,
//           role: user.role,
//           lastLogin: user.lastLogin,
//           mustChangePassword: user.mustChangePassword // Critical: Include this flag
//         },
//       },
//       timestamp: new Date().toISOString(),
//     });
//   } catch (error: any) {
//     console.error("Login error:", error);
//     res.status(500).json({
//       success: false,
//       error: "Login failed",
//       message: process.env.NODE_ENV === 'development' ? error.message : undefined,
//     });
//   }
// };


// Fix for the login function - line ~140

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

    // Find user and explicitly select password AND mustChangePassword fields
    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select("+password +mustChangePassword"); // ← Add +mustChangePassword here!

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
          mustChangePassword: user.mustChangePassword // Now this will be included!
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

    // const user = await User.findById(userId);

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

    const normalizedEmail = email.toLowerCase().trim();

    // Email format validation
    const emailRegex = /^\S+@\S+\.\S+$/;
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
          mustChangePassword: auditor.mustChangePassword,
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
 * Note: Admins use this to change their password voluntarily
 * Auditors should use /force-change-password for their first password change
 */
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { firstName, lastName, currentPassword, newPassword } = req.body;

    // Find user with password field
    // const user = await User.findById(userId).select('+password');
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
    if (firstName && firstName.trim() !== user.firstName) {
      user.firstName = firstName.trim();
      updated = true;
    }
    
    if (lastName && lastName.trim() !== user.lastName) {
      user.lastName = lastName.trim();
      updated = true;
    }

    // Update password if provided (for admins only or auditors after first change)
    if (newPassword) {
      if (!currentPassword) {
        res.status(400).json({
          success: false,
          error: "Current password is required to set new password",
        });
        return;
      }

      // Validate new password strength
      if (newPassword.length < 8) {
        res.status(400).json({
          success: false,
          error: "New password must be at least 8 characters long",
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
 * This endpoint is specifically for auditors who were created by admin
 */
// export const forceChangePassword = async (req: AuthRequest, res: Response): Promise<void> => {
//   try {
//     const userId = req.user!.id;
//     const { currentPassword, newPassword } = req.body;

//     // Validation
//     if (!currentPassword || !newPassword) {
//       res.status(400).json({
//         success: false,
//         error: "Both current and new passwords are required",
//       });
//       return;
//     }

//     // Validate new password strength
//     if (newPassword.length < 8) {
//       res.status(400).json({
//         success: false,
//         error: "New password must be at least 8 characters long",
//       });
//       return;
//     }

//     // Ensure new password is different from current
//     if (currentPassword === newPassword) {
//       res.status(400).json({
//         success: false,
//         error: "New password must be different from current password",
//       });
//       return;
//     }

//     // Find user with password field
//     const user = await User.findById(userId).select('+password');

//     if (!user) {
//       res.status(404).json({
//         success: false,
//         error: "User not found",
//       });
//       return;
//     }

//     // Only auditors with mustChangePassword flag should use this endpoint
//     if (!user.mustChangePassword) {
//       res.status(400).json({
//         success: false,
//         error: "You don't need to force change your password. Use /api/auth/update-profile instead.",
//       });
//       return;
//     }

//     // Additional check: Only auditors should have mustChangePassword flag
//     if (user.role !== UserRole.AUDITOR) {
//       res.status(403).json({
//         success: false,
//         error: "This endpoint is only for auditors with temporary passwords",
//       });
//       return;
//     }

//     // Verify current (temporary) password
//     const isPasswordValid = await user.comparePassword(currentPassword);
//     if (!isPasswordValid) {
//       res.status(401).json({
//         success: false,
//         error: "Current password is incorrect",
//       });
//       return;
//     }

//     // Set new password (will be hashed by pre-save hook)
//     user.password = newPassword;
    
//     // Clear the mustChangePassword flag
//     user.mustChangePassword = false;
    
//     await user.save();

//     res.status(200).json({
//       success: true,
//       message: "Password changed successfully. You now have full access to the system.",
//       data: {
//         mustChangePassword: false,
//       },
//       timestamp: new Date().toISOString(),
//     });
//   } catch (error: any) {
//     console.error("Force change password error:", error);
//     res.status(500).json({
//       success: false,
//       error: "Failed to change password",
//       message: process.env.NODE_ENV === 'development' ? error.message : undefined,
//     });
//   }
// };



/**
 * Force password change (for auditors with temporary passwords only)
 * PUT /api/auth/force-change-password
 * This endpoint is specifically for auditors who were created by admin
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
    if (newPassword.length < 8) {
      res.status(400).json({
        success: false,
        error: "New password must be at least 8 characters long",
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

    // Find user with password AND mustChangePassword fields - THIS IS THE FIX!
    const user = await User.findById(userId).select('+password +mustChangePassword');

    if (!user) {
      res.status(404).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    // Only auditors with mustChangePassword flag should use this endpoint
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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const role = req.query.role as string;
    const search = req.query.search as string;
    
    // Validate pagination
    if (page < 1 || limit < 1 || limit > 100) {
      res.status(400).json({
        success: false,
        error: "Invalid pagination parameters (page >= 1, limit 1-100)",
      });
      return;
    }

    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};
    
    // Filter by role if provided
    if (role && Object.values(UserRole).includes(role as UserRole)) {
      query.role = role;
    }
    
    // Search by name or email if provided
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex }
      ];
    }

    // Fetch users
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasMore: page * limit < total
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