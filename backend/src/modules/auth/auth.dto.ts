export interface AuthUserDto {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
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

export interface AuthResponseDto {
  user: AuthUserDto;
  accessToken: string;
}

export interface LogoutResponseDto {
  message: string;
}
