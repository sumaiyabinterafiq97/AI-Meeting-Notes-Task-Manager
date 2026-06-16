import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  AuthResult,
  RefreshResponseDto,
  MessageResponseDto,
  AuthUserDto,
  AuthContext,
  TokenPair,
} from './auth.dto';
import { authRepository } from './auth.repository';
import { AppError, ErrorCodes } from '../../utils/errors';
import { hashPassword, verifyPassword } from '../../lib/password';
import { generateOpaqueToken, hashToken } from '../../lib/token';
import { signAccessToken } from '../../lib/jwt';
import { env } from '../../config/env';
import { parseDurationToDate } from '../../lib/duration';
import {
  buildPasswordResetEmail,
  sendEmail,
} from '../../lib/email';

const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000;

function toAuthUser(user: {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt?: Date;
}): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    ...(user.createdAt && { createdAt: user.createdAt }),
  };
}

export class AuthService {
  async register(data: RegisterDto, context: AuthContext = {}): Promise<AuthResult> {
    const existing = await authRepository.findUserByEmail(data.email);
    if (existing) {
      throw new AppError(409, ErrorCodes.CONFLICT, 'Email already registered');
    }

    const passwordHash = await hashPassword(data.password);
    const user = await authRepository.createUser({ ...data, passwordHash });
    const tokens = await this.issueTokenPair(user.id, user.email, context);

    return {
      user: toAuthUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async login(data: LoginDto, context: AuthContext = {}): Promise<AuthResult> {
    const user = await authRepository.findUserByEmail(data.email);
    if (!user) {
      throw new AppError(401, ErrorCodes.UNAUTHORIZED, 'Invalid credentials');
    }

    const valid = await verifyPassword(data.password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, ErrorCodes.UNAUTHORIZED, 'Invalid credentials');
    }

    const tokens = await this.issueTokenPair(user.id, user.email, context);

    return {
      user: toAuthUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const tokenHash = hashToken(refreshToken);
    await authRepository.revokeRefreshToken(tokenHash);
  }

  async refresh(refreshToken: string, context: AuthContext = {}): Promise<RefreshResponseDto> {
    const tokenHash = hashToken(refreshToken);
    const stored = await authRepository.findActiveRefreshTokenByHash(tokenHash);

    if (!stored) {
      throw new AppError(401, ErrorCodes.UNAUTHORIZED, 'Invalid or expired refresh token');
    }

    const user = await authRepository.findUserById(stored.userId);
    if (!user) {
      throw new AppError(401, ErrorCodes.UNAUTHORIZED, 'Invalid or expired refresh token');
    }

    await authRepository.revokeRefreshToken(tokenHash);
    const tokens = await this.issueTokenPair(user.id, user.email, context);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async forgotPassword(data: ForgotPasswordDto): Promise<MessageResponseDto> {
    const user = await authRepository.findUserByEmail(data.email);

    if (user) {
      const rawToken = generateOpaqueToken();
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);

      await authRepository.createPasswordResetToken({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;
      await sendEmail({
        to: user.email,
        subject: 'Reset your password',
        html: buildPasswordResetEmail(resetUrl),
      });

      if (env.NODE_ENV === 'development' && !env.EMAIL_API_KEY) {
        console.info(`[auth] Password reset token for ${user.email}: ${rawToken}`);
      }
    }

    return {
      message: 'If an account exists, a reset email has been sent',
    };
  }

  async resetPassword(data: ResetPasswordDto): Promise<MessageResponseDto> {
    const tokenHash = hashToken(data.token);
    const stored = await authRepository.findActivePasswordResetTokenByHash(tokenHash);

    if (!stored) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid or expired reset token');
    }

    const passwordHash = await hashPassword(data.password);

    await authRepository.updateUserPassword(stored.userId, passwordHash);
    await authRepository.markPasswordResetTokenUsed(tokenHash);
    await authRepository.revokeAllRefreshTokensForUser(stored.userId);

    return {
      message: 'Password updated successfully',
    };
  }

  async getMe(userId: string): Promise<AuthUserDto> {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'User not found');
    }

    return toAuthUser({ ...user, createdAt: user.createdAt });
  }

  private async issueTokenPair(
    userId: string,
    email: string,
    context: AuthContext,
  ): Promise<TokenPair> {
    const accessToken = signAccessToken({ id: userId, email });
    const refreshToken = generateOpaqueToken();
    const tokenHash = hashToken(refreshToken);
    const expiresAt = parseDurationToDate(env.JWT_REFRESH_EXPIRES_IN);

    await authRepository.createRefreshToken({
      userId,
      tokenHash,
      expiresAt,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
    });

    return { accessToken, refreshToken };
  }

  // Expose for tests
  protected repository = authRepository;
}

export const authService = new AuthService();
