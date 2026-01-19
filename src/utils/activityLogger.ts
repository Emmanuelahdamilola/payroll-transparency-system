import { Request } from 'express';
import ActivityLog from '../models/ActivityLog';
import { UserRole, ActivityAction, ActivityStatus, EntityType } from '../types';

/**
 * Activity Logger Utility
 * Centralized logging for all user actions in the system
 */

// Extract IP address from request
const getIpAddress = (req: Request): string => {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    'unknown'
  );
};

// Extract user agent
const getUserAgent = (req: Request): string => {
  return req.headers['user-agent'] || 'unknown';
};

/**
 * Base logging function
 */
async function log(
  action: ActivityAction,
  userId: string,
  role: UserRole,
  entityType: EntityType,
  req: Request,
  status: ActivityStatus = ActivityStatus.SUCCESS,
  options: {
    entityId?: string;
    metadata?: any;
    errorMessage?: string;
  } = {}
): Promise<void> {
  try {
    await ActivityLog.create({
      userId,
      role,
      action,
      entityType,
      entityId: options.entityId,
      metadata: options.metadata,
      ip: getIpAddress(req),
      userAgent: getUserAgent(req),
      timestamp: new Date(),
      status,
      errorMessage: options.errorMessage
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw - logging failures shouldn't break the main flow
  }
}

/**
 * Authentication logging helpers
 */
export const logAuth = async (
  action: ActivityAction,
  userId: string,
  role: UserRole,
  req: Request,
  status: ActivityStatus = ActivityStatus.SUCCESS,
  metadata?: any
): Promise<void> => {
  await log(action, userId, role, EntityType.USER, req, status, { metadata });
};

/**
 * User management logging helpers
 */
export const logUserAction = async (
  action: ActivityAction,
  actorId: string,
  actorRole: UserRole,
  targetUserId: string,
  req: Request,
  metadata?: any
): Promise<void> => {
  await log(action, actorId, actorRole, EntityType.USER, req, ActivityStatus.SUCCESS, {
    entityId: targetUserId,
    metadata
  });
};

/**
 * Staff management logging helpers
 */
export const logStaffAction = async (
  action: ActivityAction,
  userId: string,
  userRole: UserRole,
  staffId: string,
  req: Request,
  metadata?: any,
  status: ActivityStatus = ActivityStatus.SUCCESS
): Promise<void> => {
  await log(action, userId, userRole, EntityType.STAFF, req, status, {
    entityId: staffId,
    metadata
  });
};

/**
 * Payroll logging helpers
 */
export const logPayrollAction = async (
  action: ActivityAction,
  userId: string,
  userRole: UserRole,
  payrollId: string,
  req: Request,
  metadata?: any,
  status: ActivityStatus = ActivityStatus.SUCCESS
): Promise<void> => {
  await log(action, userId, userRole, EntityType.PAYROLL, req, status, {
    entityId: payrollId,
    metadata
  });
};

/**
 * Blockchain logging helpers
 */
export const logBlockchainAction = async (
  action: ActivityAction,
  userId: string,
  userRole: UserRole,
  txHash: string,
  req: Request,
  metadata?: any,
  status: ActivityStatus = ActivityStatus.SUCCESS
): Promise<void> => {
  await log(action, userId, userRole, EntityType.BLOCKCHAIN, req, status, {
    entityId: txHash,
    metadata
  });
};

/**
 * System logging helpers
 */
export const logSystemAction = async (
  action: ActivityAction,
  userId: string,
  userRole: UserRole,
  req: Request,
  metadata?: any
): Promise<void> => {
  await log(action, userId, userRole, EntityType.SYSTEM, req, ActivityStatus.SUCCESS, {
    metadata
  });
};

// Export all action types for easy reference
export { ActivityAction };

export default {
  log,
  logAuth,
  logUserAction,
  logStaffAction,
  logPayrollAction,
  logBlockchainAction,
  logSystemAction
};