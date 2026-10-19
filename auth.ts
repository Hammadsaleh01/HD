import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@shared/types.ts';
import { userRepository } from '../database/repositories/userRepository.ts';
import { config } from '../config.ts';
import { AppError } from '../utils/errors.ts';

export const JWT_SECRET = config.jwtSecret;

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    name: string;
    city: string;
    province?: string;
    area?: string;
    verificationStatus: string;
  };
}

/**
 * JWT Authentication Middleware:
 * Hardened per Phase 1.5:
 * - Return 401 (not 403) for invalid/expired tokens
 * - Loads user from the DB and rejects immediately if deleted, Suspended, or Rejected
 * - Uses the DB role, not the role in the token
 */
export const authenticateJWT = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  // Also support reading token from cookie if set
  const cookieToken = req.cookies?.plateshare_token;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : cookieToken;

  if (!token) {
    return next(AppError.unauthorized('Authentication required: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string; email: string };

    // Fresh lookup from DB
    const dbUser = await userRepository.findById(decoded.id);
    if (!dbUser) {
      return next(AppError.unauthorized('Account no longer exists. Please sign up or log in again.'));
    }

    // Immediate enforcement of Suspension and Rejection
    if (dbUser.verificationStatus === 'Suspended') {
      return next(new AppError(403, 'ACCOUNT_SUSPENDED', 'Your account has been suspended by the platform administrator.'));
    }
    if (dbUser.verificationStatus === 'Rejected') {
      return next(new AppError(403, 'ACCOUNT_REJECTED', 'Your account registration was rejected.'));
    }

    // Attach fresh user with authoritative DB role
    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role, // Authoritative role from DB
      name: dbUser.name,
      city: dbUser.city,
      province: dbUser.province,
      area: dbUser.area,
      verificationStatus: dbUser.verificationStatus
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return next(AppError.unauthorized('Session expired. Please log in again.'));
    }
    return next(AppError.unauthorized('Invalid authentication token. Please log in again.'));
  }
};

export const optionalAuthenticateJWT = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.plateshare_token;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : cookieToken;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string; email: string };
    const dbUser = await userRepository.findById(decoded.id);
    if (dbUser && dbUser.verificationStatus !== 'Suspended' && dbUser.verificationStatus !== 'Rejected') {
      req.user = {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        name: dbUser.name,
        city: dbUser.city,
        province: dbUser.province,
        area: dbUser.area,
        verificationStatus: dbUser.verificationStatus
      };
    }
  } catch (e) {
    // Non-blocking for optional auth
  }
  next();
};

export const requireRole = (roles: Array<UserRole>) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }

    if (!roles.includes(req.user.role)) {
      return next(
        AppError.forbidden(`Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`)
      );
    }

    next();
  };
};

export const requireAdmin = () => requireRole(['Admin']);

export const requireVerifiedRestaurant = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(AppError.unauthorized());
  }

  if (req.user.role !== 'Restaurant' && req.user.role !== 'Donor' && req.user.role !== 'Admin') {
    return next(AppError.forbidden('Only restaurants or verified donors can perform this action'));
  }

  if (req.user.role === 'Restaurant' || req.user.role === 'Donor') {
    if (req.user.verificationStatus !== 'Verified' && req.user.verificationStatus !== 'Approved') {
      return next(
        AppError.forbidden(`Account verification required. Your current status is "${req.user.verificationStatus}".`)
      );
    }
  }

  next();
};

export const requireVerifiedNGO = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(AppError.unauthorized());
  }

  if (req.user.role !== 'NGO' && req.user.role !== 'Admin') {
    return next(AppError.forbidden('Only registered NGOs can perform this action'));
  }

  if (req.user.role === 'NGO') {
    if (req.user.verificationStatus !== 'Verified' && req.user.verificationStatus !== 'Approved') {
      return next(
        AppError.forbidden(`NGO verification required. Your organization is currently "${req.user.verificationStatus}".`)
      );
    }
  }

  next();
};
