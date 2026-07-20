import { Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants';

interface JoinMeetButtonProps {
  meetUrl?: string | null;
  workspaceId: string;
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export function JoinMeetButton({
  meetUrl,
  workspaceId,
  size = 'default',
  className,
}: JoinMeetButtonProps) {
  if (meetUrl) {
    return (
      <Button asChild size={size} className={className}>
        <a href={meetUrl} target="_blank" rel="noopener noreferrer">
          <Video className="h-4 w-4" aria-hidden="true" />
          Join Google Meet
        </a>
      </Button>
    );
  }

  return (
    <div className="space-y-1">
      <Button size={size} disabled className={className}>
        <Video className="h-4 w-4" aria-hidden="true" />
        Join Google Meet
      </Button>
      <p className="text-xs text-muted-foreground">
        No Meet link yet.{' '}
        <Link to={ROUTES.SETTINGS(workspaceId)} className="text-primary hover:underline">
          Connect Google Calendar
        </Link>{' '}
        to add Meet links when creating meetings.
      </p>
    </div>
  );
}
