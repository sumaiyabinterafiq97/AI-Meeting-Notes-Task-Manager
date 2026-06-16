import { authService } from '../../src/modules/auth/auth.service';
import { authRepository } from '../../src/modules/auth/auth.repository';
import { AppError } from '../../src/utils/errors';
import * as passwordLib from '../../src/lib/password';

describe('AuthService', () => {
  const mockUser = {
    id: 'user-1',
    email: 'user@example.com',
    passwordHash: 'hashed',
    displayName: 'Test User',
    avatarUrl: null,
    emailVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(passwordLib, 'hashPassword').mockResolvedValue('new-hash');
    jest.spyOn(passwordLib, 'verifyPassword').mockResolvedValue(true);
  });

  describe('register', () => {
    it('creates user and returns tokens', async () => {
      jest.spyOn(authRepository, 'findUserByEmail').mockResolvedValue(null);
      jest.spyOn(authRepository, 'createUser').mockResolvedValue(mockUser);
      jest.spyOn(authRepository, 'createRefreshToken').mockResolvedValue({
        id: 'rt-1',
        userId: mockUser.id,
        tokenHash: 'hash',
        expiresAt: new Date(),
        revokedAt: null,
        createdAt: new Date(),
        userAgent: null,
        ipAddress: null,
      });

      const result = await authService.register({
        email: 'user@example.com',
        password: 'Password1',
        displayName: 'Test User',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('user@example.com');
      expect(passwordLib.hashPassword).toHaveBeenCalledWith('Password1');
    });

    it('throws conflict when email exists', async () => {
      jest.spyOn(authRepository, 'findUserByEmail').mockResolvedValue(mockUser);

      await expect(
        authService.register({
          email: 'user@example.com',
          password: 'Password1',
          displayName: 'Test User',
        }),
      ).rejects.toThrow(AppError);
    });
  });

  describe('login', () => {
    it('returns tokens for valid credentials', async () => {
      jest.spyOn(authRepository, 'findUserByEmail').mockResolvedValue(mockUser);
      jest.spyOn(authRepository, 'createRefreshToken').mockResolvedValue({
        id: 'rt-1',
        userId: mockUser.id,
        tokenHash: 'hash',
        expiresAt: new Date(),
        revokedAt: null,
        createdAt: new Date(),
        userAgent: null,
        ipAddress: null,
      });

      const result = await authService.login({
        email: 'user@example.com',
        password: 'Password1',
      });

      expect(result.accessToken).toBeDefined();
      expect(passwordLib.verifyPassword).toHaveBeenCalled();
    });

    it('throws unauthorized for unknown email', async () => {
      jest.spyOn(authRepository, 'findUserByEmail').mockResolvedValue(null);

      await expect(
        authService.login({ email: 'missing@example.com', password: 'Password1' }),
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws unauthorized for invalid password', async () => {
      jest.spyOn(authRepository, 'findUserByEmail').mockResolvedValue(mockUser);
      jest.spyOn(passwordLib, 'verifyPassword').mockResolvedValue(false);

      await expect(
        authService.login({ email: 'user@example.com', password: 'wrong' }),
      ).rejects.toMatchObject({ statusCode: 401 });
    });
  });

  describe('forgotPassword', () => {
    it('returns generic message when user does not exist', async () => {
      jest.spyOn(authRepository, 'findUserByEmail').mockResolvedValue(null);
      const createResetSpy = jest
        .spyOn(authRepository, 'createPasswordResetToken')
        .mockResolvedValue({
          id: 'pr-1',
          userId: mockUser.id,
          tokenHash: 'hash',
          expiresAt: new Date(),
          usedAt: null,
          createdAt: new Date(),
        });

      const result = await authService.forgotPassword({ email: 'missing@example.com' });

      expect(result.message).toContain('If an account exists');
      expect(createResetSpy).not.toHaveBeenCalled();
    });

    it('creates reset token when user exists', async () => {
      jest.spyOn(authRepository, 'findUserByEmail').mockResolvedValue(mockUser);
      jest.spyOn(authRepository, 'createPasswordResetToken').mockResolvedValue({
        id: 'pr-1',
        userId: mockUser.id,
        tokenHash: 'hash',
        expiresAt: new Date(),
        usedAt: null,
        createdAt: new Date(),
      });

      await authService.forgotPassword({ email: 'user@example.com' });

      expect(authRepository.createPasswordResetToken).toHaveBeenCalled();
    });
  });
});
