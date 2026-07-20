import { AuthProvider } from '@prisma/client';
import { prisma } from '../../config/database';
import { RegisterDto } from './auth.dto';

export class AuthRepository {
  async findUserByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
  }

  async findUserByGoogleSub(googleSub: string) {
    return prisma.user.findFirst({
      where: { googleSub, deletedAt: null },
    });
  }

  async createUser(data: RegisterDto & { passwordHash: string }) {
    return prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        displayName: data.displayName,
        authProvider: AuthProvider.PASSWORD,
      },
    });
  }

  async createGoogleUser(data: {
    email: string;
    displayName: string;
    googleSub: string;
    googleEmail: string;
    avatarUrl?: string | null;
    googleAccessTokenEnc?: string | null;
    googleRefreshTokenEnc?: string | null;
    googleTokenExpiresAt?: Date | null;
  }) {
    return prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        displayName: data.displayName,
        googleSub: data.googleSub,
        googleEmail: data.googleEmail,
        avatarUrl: data.avatarUrl ?? null,
        passwordHash: null,
        authProvider: AuthProvider.GOOGLE,
        emailVerifiedAt: new Date(),
        googleAccessTokenEnc: data.googleAccessTokenEnc ?? null,
        googleRefreshTokenEnc: data.googleRefreshTokenEnc ?? null,
        googleTokenExpiresAt: data.googleTokenExpiresAt ?? null,
      },
    });
  }

  async linkGoogleAccount(
    userId: string,
    data: {
      googleSub: string;
      googleEmail: string;
      avatarUrl?: string | null;
      googleAccessTokenEnc?: string | null;
      googleRefreshTokenEnc?: string | null;
      googleTokenExpiresAt?: Date | null;
      authProvider: AuthProvider;
    },
  ) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        googleSub: data.googleSub,
        googleEmail: data.googleEmail,
        authProvider: data.authProvider,
        emailVerifiedAt: new Date(),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.googleAccessTokenEnc !== undefined && {
          googleAccessTokenEnc: data.googleAccessTokenEnc,
        }),
        ...(data.googleRefreshTokenEnc !== undefined && {
          googleRefreshTokenEnc: data.googleRefreshTokenEnc,
        }),
        ...(data.googleTokenExpiresAt !== undefined && {
          googleTokenExpiresAt: data.googleTokenExpiresAt,
        }),
      },
    });
  }

  async updateGoogleTokens(
    userId: string,
    data: {
      googleAccessTokenEnc?: string | null;
      googleRefreshTokenEnc?: string | null;
      googleTokenExpiresAt?: Date | null;
    },
  ) {
    return prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async findUserById(id: string) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async updateUserPassword(userId: string, passwordHash: string) {
    const user = await this.findUserById(userId);
    const authProvider =
      user?.authProvider === AuthProvider.GOOGLE || user?.googleSub
        ? AuthProvider.BOTH
        : AuthProvider.PASSWORD;

    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash, authProvider },
    });
  }

  async createRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }) {
    return prisma.refreshToken.create({ data });
  }

  async findActiveRefreshTokenByHash(tokenHash: string) {
    return prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async revokeRefreshToken(tokenHash: string) {
    return prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllRefreshTokensForUser(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async createPasswordResetToken(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    return prisma.passwordResetToken.create({ data });
  }

  async findActivePasswordResetTokenByHash(tokenHash: string) {
    return prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async markPasswordResetTokenUsed(tokenHash: string) {
    return prisma.passwordResetToken.updateMany({
      where: { tokenHash, usedAt: null },
      data: { usedAt: new Date() },
    });
  }
}

export const authRepository = new AuthRepository();
