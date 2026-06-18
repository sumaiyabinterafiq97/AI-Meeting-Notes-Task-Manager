import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { getApiErrorMessage } from '@/lib/api-errors';
import { ROUTES } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils';
import { ProcessingStatusBadge } from '../components/ProcessingStatusBadge';
import { MeetingMetadata } from '../components/MeetingMetadata';
import { TranscriptUpload } from '../components/TranscriptUpload';
import { ActionItemReview } from '../components/ActionItemReview';
import { LinkedTasksList } from '../components/LinkedTasksList';
import { EditMeetingDialog } from '../components/EditMeetingDialog';
import { useMeeting } from '../hooks/useMeeting';
import { useDeleteMeeting } from '../hooks/useDeleteMeeting';
import { useReprocessMeeting } from '../hooks/useReprocessMeeting';

export function MeetingDetailPage() {
  const { workspaceId, meetingId } = useParams<{ workspaceId: string; meetingId: string }>();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);

  const { data: meeting, isLoading, isError, error } = useMeeting(workspaceId, meetingId, {
    enablePolling: true,
  });
  const deleteMutation = useDeleteMeeting(workspaceId ?? '');
  const reprocessMutation = useReprocessMeeting(workspaceId ?? '', meetingId ?? '');

  const handleDelete = () => {
    if (!meetingId || !window.confirm('Delete this meeting? This action cannot be undone.')) {
      return;
    }

    deleteMutation.mutate(meetingId, {
      onSuccess: () => {
        navigate(ROUTES.MEETINGS(workspaceId!));
      },
    });
  };

  if (!workspaceId || !meetingId) {
    return <ErrorAlert message="Meeting not found" />;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner label="Loading meeting" />
      </div>
    );
  }

  if (isError || !meeting) {
    return <ErrorAlert message={getApiErrorMessage(error, 'Failed to load meeting')} />;
  }

  const isProcessing = meeting.status === 'PROCESSING';
  const canReprocess = Boolean(meeting.transcript) && !isProcessing;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <Link
          to={ROUTES.MEETINGS(workspaceId)}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to meetings
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{meeting.title}</h2>
              <ProcessingStatusBadge status={meeting.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDateTime(meeting.meetingDate)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {canReprocess && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => reprocessMutation.mutate()}
                disabled={reprocessMutation.isPending}
              >
                <RefreshCw
                  className={`h-4 w-4 ${reprocessMutation.isPending ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                {reprocessMutation.isPending ? 'Reprocessing…' : 'Reprocess'}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
              disabled={isProcessing}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {reprocessMutation.isError && (
        <ErrorAlert
          message={getApiErrorMessage(reprocessMutation.error, 'Failed to reprocess meeting')}
        />
      )}

      {isProcessing && (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
          <CardContent className="flex items-center gap-3 p-4">
            <LoadingSpinner className="h-5 w-5" label="Processing transcript" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              AI is analyzing your transcript. This page updates automatically.
            </p>
          </CardContent>
        </Card>
      )}

      {meeting.status === 'FAILED' && (
        <ErrorAlert
          message={
            meeting.aiOutput?.errorMessage ??
            'AI processing failed. Try uploading the transcript again.'
          }
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Meeting metadata and context.</CardDescription>
        </CardHeader>
        <CardContent>
          <MeetingMetadata meeting={meeting} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transcript</CardTitle>
          <CardDescription>
            {meeting.transcript
              ? `Uploaded ${formatDateTime(meeting.transcript.uploadedAt)} · ${meeting.transcript.charCount.toLocaleString()} characters · ${meeting.transcript.sourceFormat.toUpperCase()}`
              : 'Upload or paste a transcript to start AI processing.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TranscriptUpload
            workspaceId={workspaceId}
            meetingId={meetingId}
            meetingStatus={meeting.status}
            hasTranscript={Boolean(meeting.transcript)}
          />
        </CardContent>
      </Card>

      {meeting.status === 'READY' && meeting.aiOutput?.summary && (
        <Card>
          <CardHeader>
            <CardTitle>AI Summary</CardTitle>
            <CardDescription>
              {meeting.aiOutput.processedAt
                ? `Generated ${formatDateTime(meeting.aiOutput.processedAt)}`
                : 'Generated by AI'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{meeting.aiOutput.summary}</p>
          </CardContent>
        </Card>
      )}

      {(meeting.status === 'READY' || meeting.actionItems.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Action Items</CardTitle>
            <CardDescription>
              Review AI-extracted follow-ups. Accept to create tasks or reject to dismiss.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActionItemReview
              workspaceId={workspaceId}
              meetingId={meetingId}
              actionItems={meeting.actionItems}
            />
          </CardContent>
        </Card>
      )}

      {meeting.linkedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Linked Tasks</CardTitle>
            <CardDescription>Tasks created from accepted action items.</CardDescription>
          </CardHeader>
          <CardContent>
            <LinkedTasksList workspaceId={workspaceId} tasks={meeting.linkedTasks} />
          </CardContent>
        </Card>
      )}

      <EditMeetingDialog
        workspaceId={workspaceId}
        meeting={meeting}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}
