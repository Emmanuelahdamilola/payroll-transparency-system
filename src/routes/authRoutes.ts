
// import { Router } from 'express';
// import * as authController from '../controllers/authController';
// import { authenticate, requireAdmin } from '../middleware/auth';

// const router = Router();

// // Public routes
// router.post('/register', authController.register);
// router.post('/login', authController.login);
// router.post('/logout', authController.logout);

// // Protected routes
// router.get('/profile', authenticate, authController.getProfile);
// router.put('/update-profile', authenticate, authController.updateProfile);

// // Admin only routes
// router.post('/create-auditor', authenticate, requireAdmin, authController.createAuditor);
// router.get('/users', authenticate, requireAdmin, authController.listUsers);
// router.patch('/users/:id/status', authenticate, requireAdmin, authController.toggleUserStatus);

// export default router;


// src/routes/authRoutes.ts
import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

/**
 * Register a new user
 * POST /api/auth/register
 * Body: { email, password, firstName, lastName, role? }
 */
router.post('/register', authController.register);

/**
 * Login user
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: Cookie with JWT token + user data (including mustChangePassword flag)
 */
router.post('/login', authController.login);

/**
 * Logout user
 * POST /api/auth/logout
 * Clears authentication cookie
 */
router.post('/logout', authController.logout);

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================

/**
 * Get current user profile
 * GET /api/auth/profile
 * Auth: Required (any authenticated user)
 * Returns: Current user's profile data
 */
router.get('/profile', authenticate, authController.getProfile);

/**
 * Update user profile
 * PUT /api/auth/update-profile
 * Auth: Required (any authenticated user)
 * Body: { firstName?, lastName?, currentPassword?, newPassword? }
 * Note: To change password, both currentPassword and newPassword are required
 */
router.put('/update-profile', authenticate, authController.updateProfile);

/**
 * Force password change (for temporary passwords)
 * PUT /api/auth/force-change-password
 * Auth: Required (any authenticated user with mustChangePassword flag)
 * Body: { currentPassword, newPassword }
 * Clears the mustChangePassword flag after successful change
 */
router.put('/force-change-password', authenticate, authController.forceChangePassword);

// ============================================
// ADMIN ONLY ROUTES
// ============================================

/**
 * Create auditor account
 * POST /api/auth/create-auditor
 * Auth: Required (Admin only)
 * Body: { email, password, firstName, lastName }
 * Returns: Auditor data + temporaryPassword (for admin to share)
 * Note: Sets mustChangePassword flag to true
 */
router.post('/create-auditor', authenticate, requireAdmin, authController.createAuditor);

/**
 * List all users
 * GET /api/auth/users
 * Auth: Required (Admin only)
 * Query: page?, limit?, role?
 * Returns: Paginated list of users
 */
router.get('/users', authenticate, requireAdmin, authController.listUsers);

/**
 * Toggle user active status
 * PATCH /api/auth/users/:id/status
 * Auth: Required (Admin only)
 * Params: id (user ID)
 * Body: { isActive: boolean }
 * Note: Admin cannot deactivate their own account
 */
router.patch('/users/:id/status', authenticate, requireAdmin, authController.toggleUserStatus);

/**
 * Delete user account
 * DELETE /api/auth/users/:id
 * Auth: Required (Admin only)
 * Params: id (user ID)
 * Note: Admin cannot delete their own account
 */
router.delete('/users/:id', authenticate, requireAdmin, authController.deleteUser);

export default router;