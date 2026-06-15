export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  createdAt?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Array<{ field: string; message: string }>;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  role?: 'OWNER' | 'MEMBER';
  createdAt: string;
}
