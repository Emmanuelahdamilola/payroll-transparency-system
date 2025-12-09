// src/controllers/authController.ts
import { Request, Response } from "express";
import User from "../models/User";
import { generateToken } from "../utils/auth";
import { UserRole } from "../types";
import bcrypt from "bcryptjs";
import { AuthRequest } from '../types';

// Cookie configuration
const getCookieOptions = () => ({
  httpOnly: true,
  secure: true, 
  sameSite: "none" as const, 
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
});

/**
 * Register a new user (admin/auditor)
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({
        success: false,
        error: "Missing required fields (email, password, firstName, lastName)",
      });
      return;
    }

    const normalizedEmail = email.toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(400).json({
        success: false,
        error: "User with this email already exists",
      });
      return;
    }

    const userRole = role || UserRole.AUDITOR;
    if (!Object.values(UserRole).includes(userRole)) {
      res.status(400).json({
        success: false,
        error: "Invalid role. Must be admin or auditor",
      });
      return;
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      firstName,
      lastName,
      role: userRole,
      isActive: true,
      mustChangePassword: false // Self-registration = no forced change
    });

    // Generate JWT
    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Set cookie with correct settings
    res.cookie("token", token, getCookieOptions());

    res.status(201).json({
      success: true,
      message: "User registered successfully",
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
      message: error.message,
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

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: "Please provide email and password",
      });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

    if (!user) {
      res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        success: false,
        error: "Account is deactivated. Contact administrator.",
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
      return;
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Set cookie with correct settings
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
          mustChangePassword: user.mustChangePassword || false // Include flag for frontend
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      error: "Login failed",
      message: error.message,
    });
  }
};

/**
 * Logout - Clear cookie
 * POST /api/auth/logout
 */
export const logout = (req: Request, res: Response): void => {
  // Clear cookie with same settings
  res.clearCookie("token", getCookieOptions());

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

/**
 * Get current user profile
 * GET /api/auth/profile
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const user = await User.findById(userId);

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
        mustChangePassword: user.mustChangePassword || false,
        createdAt: user.createdAt,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get profile",
      message: error.message,
    });
  }
};

/**
 * Create auditor account (Admin only)
 * POST /api/auth/create-auditor
 */
export const createAuditor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({
        success: false,
        error: "Missing required fields (email, password, firstName, lastName)",
      });
      return;
    }

    const normalizedEmail = email.toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(400).json({
        success: false,
        error: "User with this email already exists",
      });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create auditor with force password change flag
    const auditor = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      firstName,
      lastName,
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
        },
        temporaryPassword: password // Return password for admin to share
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Create auditor error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create auditor",
      message: error.message,
    });
  }
};

/**
 * Update user profile
 * PUT /api/auth/update-profile
 */
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { firstName, lastName, currentPassword, newPassword } = req.body;

    const user = await User.findById(userId).select('+password');

    if (!user) {
      res.status(404).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    // Update name fields if provided
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;

    // Update password if provided
    if (newPassword) {
      if (!currentPassword) {
        res.status(400).json({
          success: false,
          error: "Current password is required to set new password",
        });
        return;
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          error: "Current password is incorrect",
        });
        return;
      }

      // Hash new password
      user.password = await bcrypt.hash(newPassword, 10);
      
      // Clear mustChangePassword flag if it was set
      if (user.mustChangePassword) {
        user.mustChangePassword = false;
      }
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
        mustChangePassword: user.mustChangePassword || false
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update profile",
      message: error.message,
    });
  }
};

/**
 * Force password change (for temporary passwords)
 * PUT /api/auth/force-change-password
 */
export const forceChangePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: "Both current and new password are required",
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

    const user = await User.findById(userId).select('+password');

    if (!user) {
      res.status(404).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    // Verify current (temporary) password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: "Current password is incorrect",
      });
      return;
    }

    // Hash new password
    user.password = await bcrypt.hash(newPassword, 10);
    
    // Clear the mustChangePassword flag
    user.mustChangePassword = false;
    
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully. You can now access the system.",
      data: {
        mustChangePassword: false
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Force change password error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to change password",
      message: error.message,
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
    const skip = (page - 1) * limit;

    const query: any = {};
    if (role && Object.values(UserRole).includes(role as UserRole)) {
      query.role = role;
    }

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
          pages: Math.ceil(total / limit)
        }
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("List users error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to list users",
      message: error.message,
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
        error: 'You cannot deactivate your own account'
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

    user.isActive = isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: user._id,
        email: user.email,
        isActive: user.isActive
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Toggle user status error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update user status",
      message: error.message,
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

    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: {
        id,
        email: user.email
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete user",
      message: error.message,
    });
  }
};