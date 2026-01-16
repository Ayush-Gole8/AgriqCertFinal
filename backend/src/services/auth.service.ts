import { User } from '../models/user.model.js';
import { AuditLog } from '../models/auditLog.model.js';
import { JWTService } from '../utils/jwt.util.js';
import { AppError } from '../middleware/errorHandler.middleware.js';

interface RegisterInput {
    email: string;
    password: string;
    name: string;
    role?: string;
    organization?: string;
    phone?: string;
    address?: string;
    ipAddress?: string;
    userAgent?: string | null;
}

interface LoginInput {
    email: string;
    password: string;
    ipAddress?: string;
    userAgent?: string | null;
}

interface UpdateProfileInput {
    userId: string;
    name?: string;
    avatar?: string;
    organization?: string;
    phone?: string;
    address?: string;
    ipAddress?: string;
    userAgent?: string | null;
}

interface ChangePasswordInput {
    userId: string;
    currentPassword: string;
    newPassword: string;
    ipAddress?: string;
    userAgent?: string | null;
}

interface LogoutInput {
    userId: string;
    refreshToken?: string;
    userName: string;
    ipAddress?: string;
    userAgent?: string | null;
}

export class AuthService {
    static async register(input: RegisterInput) {
        const existingUser = await User.findOne({ email: input.email });
        if (existingUser) {
            throw new AppError(409, 'User with this email already exists');
        }

        if (input.role === 'admin') {
            throw new AppError(403, 'Admin users cannot be registered via this endpoint');
        }

        const user = await User.create({
            email: input.email,
            password: input.password,
            name: input.name,
            role: input.role || 'farmer',
            organization: input.organization,
            phone: input.phone,
            address: input.address,
            isActive: true,
            isVerified: false,
        });

        const tokens = JWTService.generateTokenPair(
            user._id.toString(),
            user.email,
            user.role
        );

        user.refreshTokens = JWTService.addRefreshToken(user.refreshTokens, tokens.refreshToken);
        await user.save();

        await AuditLog.create({
            userId: user._id.toString(),
            userName: user.name,
            action: 'USER_REGISTERED',
            resource: 'user',
            resourceId: user._id.toString(),
            details: { role: user.role },
            ipAddress: input.ipAddress,
            userAgent: input.userAgent ?? undefined,
            timestamp: new Date(),
        });

        return { user, tokens };
    }

    static async login(input: LoginInput) {
        const user = await User.findOne({
            email: input.email,
            isActive: true,
        }).select('+password +refreshTokens');

        if (!user) {
            throw new AppError(401, 'Invalid email or password');
        }

        const isPasswordValid = await user.comparePassword(input.password);
        if (!isPasswordValid) {
            throw new AppError(401, 'Invalid email or password');
        }

        const tokens = JWTService.generateTokenPair(
            user._id.toString(),
            user.email,
            user.role
        );

        user.refreshTokens.push(tokens.refreshToken);
        if (user.refreshTokens.length > 5) {
            user.refreshTokens = user.refreshTokens.slice(-5);
        }
        user.lastLogin = new Date();
        await user.save();

        await AuditLog.create({
            userId: user._id.toString(),
            userName: user.name,
            action: 'USER_LOGIN',
            resource: 'user',
            resourceId: user._id.toString(),
            ipAddress: input.ipAddress,
            userAgent: input.userAgent ?? undefined,
            timestamp: new Date(),
        });

        return { user, tokens };
    }

    static async refreshToken(refreshToken: string) {
        if (!refreshToken) {
            throw new AppError(400, 'Refresh token is required');
        }

        let decoded;
        try {
            decoded = JWTService.verifyRefreshToken(refreshToken);
        } catch {
            throw new AppError(401, 'Invalid or expired refresh token');
        }

        const user = await User.findById(decoded.userId).select('+refreshTokens');

        if (!user || !user.isActive) {
            throw new AppError(401, 'Invalid refresh token');
        }

        if (!user.refreshTokens.includes(refreshToken)) {
            throw new AppError(401, 'Refresh token has been revoked');
        }

        user.refreshTokens = user.refreshTokens.filter(
            (token) => token !== refreshToken
        );

        const tokens = JWTService.generateTokenPair(
            user._id.toString(),
            user.email,
            user.role
        );

        user.refreshTokens.push(tokens.refreshToken);
        await user.save();

        return { tokens };
    }

    static async logout(input: LogoutInput) {
        const user = await User.findById(input.userId).select('+refreshTokens');

        if (user && input.refreshToken) {
            user.refreshTokens = JWTService.removeRefreshToken(user.refreshTokens, input.refreshToken);
            await user.save();
        }

        await AuditLog.create({
            userId: input.userId,
            userName: input.userName,
            action: 'USER_LOGOUT',
            resource: 'user',
            resourceId: input.userId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent ?? undefined,
            timestamp: new Date(),
        });
    }

    static async getProfile(userId: string) {
        const user = await User.findById(userId);

        if (!user) {
            throw new AppError(404, 'User not found');
        }

        return user;
    }

    static async updateProfile(input: UpdateProfileInput) {
        const user = await User.findById(input.userId);

        if (!user) {
            throw new AppError(404, 'User not found');
        }

        if (input.name !== undefined) user.name = input.name;
        if (input.avatar !== undefined) user.avatar = input.avatar;
        if (input.organization !== undefined) user.organization = input.organization;
        if (input.phone !== undefined) user.phone = input.phone;
        if (input.address !== undefined) user.address = input.address;

        await user.save();

        await AuditLog.create({
            userId: input.userId,
            userName: user.name,
            action: 'PROFILE_UPDATED',
            resource: 'user',
            resourceId: input.userId,
            details: {
                updatedFields: Object.keys({
                    name: input.name,
                    avatar: input.avatar,
                    organization: input.organization,
                    phone: input.phone,
                    address: input.address,
                }).filter(
                    (key) =>
                        (input as any)[key] !== undefined &&
                        (input as any)[key] !== null
                ),
            },
            ipAddress: input.ipAddress,
            userAgent: input.userAgent ?? undefined,
            timestamp: new Date(),
        });

        return user;
    }

    static async changePassword(input: ChangePasswordInput) {
        const user = await User.findById(input.userId).select(
            '+password +refreshTokens'
        );

        if (!user) {
            throw new AppError(404, 'User not found');
        }

        const isPasswordValid = await user.comparePassword(input.currentPassword);
        if (!isPasswordValid) {
            throw new AppError(401, 'Current password is incorrect');
        }

        user.password = input.newPassword;
        user.refreshTokens = [];

        await user.save();

        await AuditLog.create({
            userId: input.userId,
            userName: user.name,
            action: 'PASSWORD_CHANGED',
            resource: 'user',
            resourceId: input.userId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent ?? undefined,
            timestamp: new Date(),
        });
    }
}

export default AuthService;

