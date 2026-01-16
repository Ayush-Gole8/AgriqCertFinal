import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler.middleware.js';
import { AuthService } from '../services/auth.service.js';
import { authCookieOptions, clearAuthCookieOptions } from '../config/cokkie.config.js';

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

export class AuthController {
  /**
   * Register new user
   */
  static register = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, name, role, organization, phone, address } = req.body;

    const { user, tokens } = await AuthService.register({
      email,
      password,
      name,
      role,
      organization,
      phone,
      address,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.cookie('agriqcert_access_token', tokens.accessToken, authCookieOptions);
    res.cookie('agriqcert_refresh_token', tokens.refreshToken, authCookieOptions);

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

    const { user, tokens } = await AuthService.login({
      email,
      password,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.cookie('agriqcert_access_token', tokens.accessToken, authCookieOptions);
    res.cookie('agriqcert_refresh_token', tokens.refreshToken, authCookieOptions);

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
    const bodyToken = req.body?.refreshToken as string | undefined;
    const cookieToken = getCookie(req, 'agriqcert_refresh_token');
    const refreshToken = bodyToken || cookieToken;

    if (!refreshToken) {
      throw new AppError(400, 'Refresh token is required');
    }

    const { tokens } = await AuthService.refreshToken(refreshToken);

    res.cookie('agriqcert_access_token', tokens.accessToken, authCookieOptions);
    res.cookie('agriqcert_refresh_token', tokens.refreshToken, authCookieOptions);

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

    const bodyToken = req.body?.refreshToken as string | undefined;
    const cookieToken = getCookie(req, 'agriqcert_refresh_token');
    const refreshToken = bodyToken || cookieToken;

    await AuthService.logout({
      userId: req.user.userId,
      refreshToken,
      userName: req.user.name,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.clearCookie('agriqcert_access_token', clearAuthCookieOptions);
    res.clearCookie('agriqcert_refresh_token', clearAuthCookieOptions);

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

    const user = await AuthService.getProfile(req.user.userId);

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

    const user = await AuthService.updateProfile({
      userId: req.user.userId,
      name,
      avatar,
      organization,
      phone,
      address,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
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

    await AuthService.changePassword({
      userId: req.user.userId,
      currentPassword,
      newPassword,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.clearCookie('agriqcert_access_token', clearAuthCookieOptions);
    res.clearCookie('agriqcert_refresh_token', clearAuthCookieOptions);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please login again.',
    });
  });
}
