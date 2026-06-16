export interface AuthUserDto {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  createdAt?: Date;
}

export interface RegisterDto {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
}

export interface AuthResponseDto {
  user: AuthUserDto;
  accessToken: string;
}

export interface AuthResult extends AuthResponseDto {
  refreshToken: string;
}

export interface RefreshResponseDto {
  accessToken: string;
  refreshToken: string;
}

export interface MessageResponseDto {
  message: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthContext {
  userAgent?: string;
  ipAddress?: string;
}
