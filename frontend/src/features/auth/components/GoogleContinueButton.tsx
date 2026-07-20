import { Button } from '@/components/ui/button';
import { startGoogleSignIn } from '../services/google-auth';

interface GoogleContinueButtonProps {
  label?: string;
  disabled?: boolean;
}

export function GoogleContinueButton({
  label = 'Continue with Google',
  disabled,
}: GoogleContinueButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full min-h-11"
      disabled={disabled}
      onClick={() => startGoogleSignIn()}
    >
      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="currentColor"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="currentColor"
          d="M5.84 14.09c-1.41 0-2.54-.93-2.98-2.16H.5v2.84C1.24 18.07 3.94 14.09 5.84 14.09z"
        />
        <path
          fill="currentColor"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {label}
    </Button>
  );
}
