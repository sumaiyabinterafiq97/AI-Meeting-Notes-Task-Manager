import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { MeetingStatus } from '../types/meeting.types';

interface TranscriptionStatusBannerProps {
  status: MeetingStatus;
}

export function TranscriptionStatusBanner({ status }: TranscriptionStatusBannerProps) {
  if (status === 'TRANSCRIBING') {
    return (
      <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
        <CardContent className="flex items-center gap-3 p-4">
          <Loader2
            className="h-5 w-5 animate-spin text-amber-800 dark:text-amber-100"
            aria-hidden
          />
          <p className="text-sm text-amber-900 dark:text-amber-100" role="status">
            Transcribing your recording. AI insights will appear automatically when ready.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (status === 'PROCESSING') {
    return (
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent className="flex items-center gap-3 p-4">
          <Loader2 className="h-5 w-5 animate-spin text-blue-800 dark:text-blue-200" aria-hidden />
          <p className="text-sm text-blue-800 dark:text-blue-200" role="status">
            AI is analyzing your transcript. Insights and chat update automatically.
          </p>
        </CardContent>
      </Card>
    );
  }

  return null;
}
