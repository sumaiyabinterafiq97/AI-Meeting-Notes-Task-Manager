import { generateOpaqueToken, hashToken } from '../../src/lib/token';
import { authRepository } from '../../src/modules/auth/auth.repository';

export const testUser = {
  email: 'test@example.com',
  password: 'Password1',
  displayName: 'Test User',
};

export async function createPasswordResetTokenForUser(userId: string): Promise<string> {
  const rawToken = generateOpaqueToken();
  await authRepository.createPasswordResetToken({
    userId,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
  return rawToken;
}
