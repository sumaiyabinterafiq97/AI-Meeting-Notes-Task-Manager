import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { getApiErrorMessage } from '@/lib/api-errors';
import { ROUTES } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils';
import { ProcessingStatusBadge } from '../components/ProcessingStatusBadge';
import { MeetingMetadata } from '../components/MeetingMetadata';
import { AudioUpload } from '../components/AudioUpload';
import { TranscriptUpload } from '../components/TranscriptUpload';
import { TranscriptDocument } from '../components/TranscriptDocument';
import { EditMeetingDialog } from '../components/EditMeetingDialog';
import { JoinMeetButton } from '../components/JoinMeetButton';
import { ScreenRecorder } from '../components/ScreenRecorder';
import { TranscriptionStatusBanner } from '../transcription-status';
import { MeetingChatPanel } from '@/features/chat/components/MeetingChatPanel';
import { useMeeting } from '../hooks/useMeeting';
import { useDeleteMeeting } from '../hooks/useDeleteMeeting';
import { useReprocessMeeting } from '../hooks/useReprocessMeeting';

export function MeetingDetailPage() {
  const { workspaceId, meetingId } = useParams<{ workspaceId: string; meetingId: string }>();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);

  const {
    data: meeting,
    isLoading,
    isError,
    error,
  } = useMeeting(workspaceId, meetingId, {
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

  const isTranscribing = meeting.status === 'TRANSCRIBING';
  const isProcessing = meeting.status === 'PROCESSING';
  const isBusy = isTranscribing || isProcessing;
  const canReprocess = Boolean(meeting.transcript) && !isBusy;
  const hasTranscript = Boolean(meeting.transcript);
  const canChat = hasTranscript && (meeting.status === 'READY' || meeting.status === 'PROCESSING');
  const chatDisabled =
    isBusy || meeting.status === 'FAILED' || meeting.status === 'DRAFT' || isTranscribing;
  const chatDisabledReason = isTranscribing
    ? 'Chat is available once transcription and AI processing complete.'
    : isProcessing
      ? 'Chat is available once AI processing completes.'
      : meeting.status === 'DRAFT'
        ? 'Upload a recording and run Translate & Transcribe, or paste a transcript, to chat about this meeting.'
        : meeting.status === 'FAILED'
          ? 'Chat is unavailable while AI processing has failed.'
          : undefined;

  const defaultTab = hasTranscript ? 'transcript' : 'capture';

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
            <p className="text-sm text-muted-foreground">{formatDateTime(meeting.meetingDate)}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <JoinMeetButton meetUrl={meeting.meetUrl} workspaceId={workspaceId} size="sm" />
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
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} disabled={isBusy}>
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

      <TranscriptionStatusBanner status={meeting.status} />

      {meeting.status === 'FAILED' && (
        <ErrorAlert
          message={
            meeting.aiOutput?.errorMessage ??
            'Processing failed. Retry Translate & Transcribe or upload a recording / transcript again.'
          }
        />
      )}

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="capture">Record & upload</TabsTrigger>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="capture" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Record meeting</CardTitle>
              <CardDescription>
                Join Google Meet, then record the Meet tab here. Download locally or upload — then
                use Translate &amp; Transcribe below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScreenRecorder
                workspaceId={workspaceId}
                meetingId={meetingId}
                meetingStatus={meeting.status}
                hasRecording={Boolean(meeting.audio) || hasTranscript}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upload recording</CardTitle>
              <CardDescription>
                Store audio or video first. Click Translate &amp; Transcribe when you are ready to
                create an English transcript and AI notes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AudioUpload
                workspaceId={workspaceId}
                meetingId={meetingId}
                meetingStatus={meeting.status}
                hasTranscript={hasTranscript}
                audio={meeting.audio}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Paste transcript</CardTitle>
              <CardDescription>
                Optional alternative if you already have a text transcript.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TranscriptUpload
                workspaceId={workspaceId}
                meetingId={meetingId}
                meetingStatus={meeting.status}
                hasTranscript={hasTranscript}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transcript">
          <Card>
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
              <CardDescription>
                Readable transcript for this meeting. Download as .txt or .md anytime.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {meeting.transcript ? (
                <TranscriptDocument title={meeting.title} transcript={meeting.transcript} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No transcript yet. Upload a recording and click Translate &amp; Transcribe on the
                  Record &amp; upload tab.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat">
          <Card>
            <CardHeader>
              <CardTitle>Meeting chat</CardTitle>
              <CardDescription>
                Ask questions, summarize, or take notes grounded in this meeting&apos;s transcript.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {canChat || hasTranscript ? (
                <MeetingChatPanel
                  embedded
                  workspaceId={workspaceId}
                  meetingId={meetingId}
                  meetingTitle={meeting.title}
                  disabled={chatDisabled}
                  disabledReason={chatDisabledReason}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Upload a recording or transcript first, then chat about this meeting.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Meeting details</CardTitle>
              <CardDescription>
                Metadata and calendar context
                {meeting.meetUrl ? ' · Google Meet link available above' : ''}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MeetingMetadata meeting={meeting} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EditMeetingDialog
        workspaceId={workspaceId}
        meeting={meeting}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}
