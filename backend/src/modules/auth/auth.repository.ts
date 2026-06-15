import { prisma } from '../../config/database';
import { RegisterDto } from './auth.dto';

export class AuthRepository {
  async findUserByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
  }

  async createUser(data: RegisterDto & { passwordHash: string }) {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        displayName: data.displayName,
      },
    });
  }

  async findUserById(id: string) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
  }

  // Placeholder for refresh token management
  async revokeRefreshToken(_tokenHash: string): Promise<void> {
    // Implementation pending
  }
}

export const authRepository = new AuthRepository();
