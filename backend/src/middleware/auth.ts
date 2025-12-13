import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../utils/jwt.js';
import { User } from '../models/User.js';
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

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access token is required',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token
    const decoded = JWTService.verifyAccessToken(token);
    
    // Check if user still exists and is active
    const user = await User.findById(decoded.userId).select('+isActive');
    
    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: 'User not found or inactive',
      });
      return;
    }

    // Attach user info to request
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

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
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
  } catch (error) {
    // Continue without authentication if token is invalid
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
