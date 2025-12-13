import { Request, Response } from 'express';
import { User } from '../models/User.js';
import { JWTService } from '../utils/jwt.js';
import { AuditLog } from '../models/AuditLog.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

export class AuthController {
  /**
   * Register new user
   */
  static register = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, name, role, organization, phone, address } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError(409, 'User with this email already exists');
    }

    // Create user
    const user = await User.create({
      email,
      password,
      name,
      role: role || 'farmer',
      organization,
      phone,
      address,
      isActive: true,
      isVerified: false,
    });

    // Generate tokens
    const tokens = JWTService.generateTokenPair(
      user._id.toString(),
      user.email,
      user.role
    );

    // Save refresh token
    user.refreshTokens.push(tokens.refreshToken);
    await user.save();

    // Log audit
    await AuditLog.create({
      userId: user._id.toString(),
      userName: user.name,
      action: 'USER_REGISTERED',
      resource: 'user',
      resourceId: user._id.toString(),
      details: { role: user.role },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date(),
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          organization: user.organization,
          createdAt: user.createdAt,
        },
        tokens,
      },
    });
  });

  /**
   * Login user
   */
  static login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // Find user and include password field
    const user = await User.findOne({ email, isActive: true }).select('+password +refreshTokens');
    
    if (!user) {
      throw new AppError(401, 'Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid email or password');
    }

    // Generate tokens
    const tokens = JWTService.generateTokenPair(
      user._id.toString(),
      user.email,
      user.role
    );

    // Save refresh token
    user.refreshTokens.push(tokens.refreshToken);
    
    // Keep only last 5 refresh tokens
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }
    
    user.lastLogin = new Date();
    await user.save();

    // Log audit
    await AuditLog.create({
      userId: user._id.toString(),
      userName: user.name,
      action: 'USER_LOGIN',
      resource: 'user',
      resourceId: user._id.toString(),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          organization: user.organization,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
        },
        tokens,
      },
    });
  });

  /**
   * Refresh access token
   */
  static refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError(400, 'Refresh token is required');
    }

    // Verify refresh token (handle verification errors explicitly so we return 401)
    let decoded;
    try {
      decoded = JWTService.verifyRefreshToken(refreshToken);
    } catch (err: any) {
      throw new AppError(401, 'Invalid or expired refresh token');
    }

    // Find user and check if refresh token is valid
    const user = await User.findById(decoded.userId).select('+refreshTokens');
    
    if (!user || !user.isActive) {
      throw new AppError(401, 'Invalid refresh token');
    }

    if (!user.refreshTokens.includes(refreshToken)) {
      throw new AppError(401, 'Refresh token has been revoked');
    }

    // Remove old refresh token
    user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);

    // Generate new tokens
    const tokens = JWTService.generateTokenPair(
      user._id.toString(),
      user.email,
      user.role
    );

    // Save new refresh token
    user.refreshTokens.push(tokens.refreshToken);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: { tokens },
    });
  });

  /**
   * Logout user
   */
  static logout = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const refreshToken = req.body.refreshToken;

    // Find user and remove refresh token
    const user = await User.findById(req.user.userId).select('+refreshTokens');
    
    if (user && refreshToken) {
      user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);
      await user.save();
    }

    // Log audit
    await AuditLog.create({
      userId: req.user.userId,
      userName: req.user.name,
      action: 'USER_LOGOUT',
      resource: 'user',
      resourceId: req.user.userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  });

  /**
   * Get current user profile
   */
  static getProfile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const user = await User.findById(req.user.userId);
    
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          organization: user.organization,
          phone: user.phone,
          address: user.address,
          isVerified: user.isVerified,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  });

  /**
   * Update user profile
   */
  static updateProfile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { name, avatar, organization, phone, address } = req.body;

    const user = await User.findById(req.user.userId);
    
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Update allowed fields
    if (name !== undefined) user.name = name;
    if (avatar !== undefined) user.avatar = avatar;
    if (organization !== undefined) user.organization = organization;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;

    await user.save();

    // Log audit
    await AuditLog.create({
      userId: req.user.userId,
      userName: req.user.name,
      action: 'PROFILE_UPDATED',
      resource: 'user',
      resourceId: req.user.userId,
      details: { updatedFields: Object.keys(req.body) },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user },
    });
  });

  /**
   * Change password
   */
  static changePassword = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.userId).select('+password +refreshTokens');
    
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new AppError(401, 'Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    
    // Revoke all refresh tokens for security
    user.refreshTokens = [];
    
    await user.save();

    // Log audit
    await AuditLog.create({
      userId: req.user.userId,
      userName: req.user.name,
      action: 'PASSWORD_CHANGED',
      resource: 'user',
      resourceId: req.user.userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please login again.',
    });
  });
}
