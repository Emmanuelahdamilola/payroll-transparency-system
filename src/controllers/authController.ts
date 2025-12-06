import { Request, Response } from "express";
import User from "../models/User";
import { generateToken } from "../utils/auth";
import { UserRole } from "../types";
import bcrypt from "bcryptjs";

/**
 * Register a new user (admin/auditor)
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
    });

    // Generate JWT
    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

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

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

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
 */
export const logout = (req: Request, res: Response): void => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    path: "/",
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

/**
 * Get current user profile
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
