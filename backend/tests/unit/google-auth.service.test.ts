import { AuthProvider } from '@prisma/client';
import { googleAuthService } from '../../src/modules/auth/google-auth.service';
import { authRepository } from '../../src/modules/auth/auth.repository';
import { AppError } from '../../src/utils/errors';
import * as tokenCrypto from '../../src/modules/calendar/utils/token-crypto';

describe('GoogleAuthService', () => {
  const googleUser = {
    id: 'user-g1',
    email: 'google.user@example.com',
    passwordHash: null,
    displayName: 'Google Mock User',
    avatarUrl: null,
    emailVerifiedAt: new Date(),
    authProvider: AuthProvider.GOOGLE,
    googleSub: 'mock-google-sub-001',
    googleEmail: 'google.user@example.com',
    googleRefreshTokenEnc: null,
    googleAccessTokenEnc: null,
    googleTokenExpiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(tokenCrypto, 'encryptToken').mockImplementation((v) => `enc:${v}`);
    process.env.GOOGLE_AUTH_USE_MOCK = 'true';
    process.env.AI_USE_MOCK = 'true';
  });

  it('creates a Google user and session in mock mode', async () => {
    jest.spyOn(authRepository, 'findUserByGoogleSub').mockResolvedValue(null);
    jest.spyOn(authRepository, 'findUserByEmail').mockResolvedValue(null);
    jest.spyOn(authRepository, 'createGoogleUser').mockResolvedValue(googleUser);
    jest.spyOn(authRepository, 'createRefreshToken').mockResolvedValue({
      id: 'rt-1',
      userId: googleUser.id,
      tokenHash: 'hash',
      expiresAt: new Date(),
      revokedAt: null,
      createdAt: new Date(),
      userAgent: null,
      ipAddress: null,
    });

    const result = await googleAuthService.handleMockSignIn();

    expect(result.user.email).toBe('google.user@example.com');
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(authRepository.createGoogleUser).toHaveBeenCalled();
  });

  it('links Google to an existing password account with the same email', async () => {
    const passwordUser = {
      ...googleUser,
      id: 'user-pw',
      passwordHash: 'hashed',
      authProvider: AuthProvider.PASSWORD,
      googleSub: null,
      googleEmail: null,
    };

    jest.spyOn(authRepository, 'findUserByGoogleSub').mockResolvedValue(null);
    jest.spyOn(authRepository, 'findUserByEmail').mockResolvedValue(passwordUser);
    jest.spyOn(authRepository, 'linkGoogleAccount').mockResolvedValue({
      ...passwordUser,
      googleSub: 'mock-google-sub-001',
      googleEmail: 'google.user@example.com',
      authProvider: AuthProvider.BOTH,
    });
    jest.spyOn(authRepository, 'createRefreshToken').mockResolvedValue({
      id: 'rt-1',
      userId: 'user-pw',
      tokenHash: 'hash',
      expiresAt: new Date(),
      revokedAt: null,
      createdAt: new Date(),
      userAgent: null,
      ipAddress: null,
    });

    const result = await googleAuthService.handleMockSignIn();

    expect(authRepository.linkGoogleAccount).toHaveBeenCalledWith(
      'user-pw',
      expect.objectContaining({
        googleSub: 'mock-google-sub-001',
        authProvider: AuthProvider.BOTH,
      }),
    );
    expect(result.user.id).toBe('user-pw');
  });

  it('rejects when email is linked to a different Google subject', async () => {
    jest.spyOn(authRepository, 'findUserByGoogleSub').mockResolvedValue(null);
    jest.spyOn(authRepository, 'findUserByEmail').mockResolvedValue({
      ...googleUser,
      googleSub: 'other-sub',
      passwordHash: 'hashed',
      authProvider: AuthProvider.BOTH,
    });

    await expect(googleAuthService.handleMockSignIn()).rejects.toBeInstanceOf(AppError);
    await expect(googleAuthService.handleMockSignIn()).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});
