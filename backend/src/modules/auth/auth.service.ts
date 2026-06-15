import { RegisterDto, LoginDto, AuthResponseDto } from './auth.dto';
import { authRepository } from './auth.repository';
import { AppError, ErrorCodes } from '../../utils/errors';

export class AuthService {
  async register(_data: RegisterDto): Promise<AuthResponseDto> {
    // Business logic: hash password, create user, generate tokens
    throw new AppError(501, ErrorCodes.INTERNAL_ERROR, 'Register not yet implemented');
  }

  async login(_data: LoginDto): Promise<AuthResponseDto> {
    // Business logic: verify credentials, generate tokens
    throw new AppError(501, ErrorCodes.INTERNAL_ERROR, 'Login not yet implemented');
  }

  async logout(_userId: string): Promise<void> {
    // Business logic: revoke refresh token
    throw new AppError(501, ErrorCodes.INTERNAL_ERROR, 'Logout not yet implemented');
  }

  // Expose repository for future use
  protected repository = authRepository;
}

export const authService = new AuthService();
