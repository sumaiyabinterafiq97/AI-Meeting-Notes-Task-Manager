import { API_BASE_URL } from '@/lib/constants';

/** Full-page redirect into backend Google OAuth (sets refresh cookie on callback). */
export function startGoogleSignIn(): void {
  const base = API_BASE_URL.replace(/\/$/, '');
  window.location.assign(`${base}/auth/google`);
}
