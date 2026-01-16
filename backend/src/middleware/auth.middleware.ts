import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../utils/jwt.util.js';
import { User } from '../models/user.model.js';
import { UserRole } from '../types/index.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: UserRole;
        name: string;
      };
      token?: string;
    }
  }
}

const getCookie = (req: Request, name: string): string | undefined => {
  const header = req.headers.cookie;
  if (!header) return undefined;
  const parts = header.split(';');
  for (const part of parts) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return undefined;
};

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      token = getCookie(req, 'agriqcert_access_token');
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token is required',
      });
      return;
    }

    const decoded = JWTService.verifyAccessToken(token);

    const user = await User.findById(decoded.userId).select('+isActive');

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: 'User not found or inactive',
      });
      return;
    }

    req.user = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    };
    req.token = token;

    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: error.message || 'Invalid or expired token',
    });
  }
};

/**
 * Authorization middleware - checks user roles
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};

export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      token = getCookie(req, 'agriqcert_access_token');
    }

    if (token) {
      const decoded = JWTService.verifyAccessToken(token);

      const user = await User.findById(decoded.userId).select('+isActive');

      if (user && user.isActive) {
        req.user = {
          userId: user._id.toString(),
          email: user.email,
          role: user.role,
          name: user.name,
        };
        req.token = token;
      }
    }

    next();
  } catch {
    next();
  }
};

/**
 * Check if user owns the resource
 */
export const isOwner = (resourceUserIdField: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];

    if (!resourceUserId) {
      res.status(400).json({
        success: false,
        message: 'Resource user ID not found',
      });
      return;
    }

    // Admins can access any resource
    if (req.user.role === 'admin') {
      next();
      return;
    }

    // Check ownership
    if (req.user.userId !== resourceUserId) {
      res.status(403).json({
        success: false,
        message: 'Access denied: You do not own this resource',
      });
      return;
    }

    next();
  };
};

/**
 * Check if user can perform action on batch
 */
export const canAccessBatch = (action: 'view' | 'edit' | 'inspect' | 'certify') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { role } = req.user;

    // Define role-based permissions
    const permissions: Record<UserRole, string[]> = {
      farmer: ['view', 'edit'],
      qa_inspector: ['view', 'inspect'],
      certifier: ['view', 'certify'],
      admin: ['view', 'edit', 'inspect', 'certify'],
      verifier: ['view'],
    };

    if (!permissions[role]?.includes(action)) {
      res.status(403).json({
        success: false,
        message: `Insufficient permissions to ${action} batch`,
      });
      return;
    }

    next();
  };
};
