import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import config from '../config/config.js';
import { UserRole } from '../types/index.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
  jti?: string;
}

export class JWTService {
  /**
   * Generate access token
   */
  static generateAccessToken(userId: string, email: string, role: UserRole): string {
    const payload: TokenPayload = {
      userId,
      email,
      role,
      type: 'access',
      jti: nanoid(),
    };

    // Use a typed-any call to avoid mismatch with jsonwebtoken overloads in this TS setup
    return (jwt.sign as any)(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
      issuer: 'agriqcert-api',
      audience: 'agriqcert-app',
    });
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(userId: string, email: string, role: UserRole): string {
    const payload: TokenPayload = {
      userId,
      email,
      role,
      type: 'refresh',
      jti: nanoid(),
    };

    return (jwt.sign as any)(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
      issuer: 'agriqcert-api',
      audience: 'agriqcert-app',
    });
  }

  /**
   * Generate both access and refresh tokens
   */
  static generateTokenPair(userId: string, email: string, role: UserRole) {
    return {
      accessToken: this.generateAccessToken(userId, email, role),
      refreshToken: this.generateRefreshToken(userId, email, role),
    };
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): TokenPayload {
    try {
      const secret = config.jwt.secret;
      if (!secret) {
        throw new Error('JWT secret not configured');
      }
      const decoded = jwt.verify(token, secret, {
        issuer: 'agriqcert-api',
        audience: 'agriqcert-app',
      }) as unknown as TokenPayload;

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): TokenPayload {
    try {
      const secret = config.jwt.refreshSecret;
      if (!secret) {
        throw new Error('JWT refresh secret not configured');
      }
      const decoded = jwt.verify(token, secret, {
        issuer: 'agriqcert-api',
        audience: 'agriqcert-app',
      }) as unknown as TokenPayload;

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Add new refresh token and manage token rotation (max 5 tokens)
   */
  static addRefreshToken(currentTokens: string[], newToken: string): string[] {
    const tokens = [...currentTokens, newToken];
    if (tokens.length > 5) {
      return tokens.slice(-5);
    }
    return tokens;
  }

  /**
   * Remove a refresh token
   */
  static removeRefreshToken(currentTokens: string[], tokenToRemove: string): string[] {
    return currentTokens.filter(token => token !== tokenToRemove);
  }

  /**
   * Decode token without verification (for debugging)
   */
  static decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch {
      return null;
    }
  }

  /**
   * Get token expiration time
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch {
      return null;
    }
  }
}
