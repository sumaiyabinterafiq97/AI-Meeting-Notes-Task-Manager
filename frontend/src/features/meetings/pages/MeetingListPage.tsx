import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { EmptyState } from '@/components/common/EmptyState';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useDebounce } from '@/hooks/useDebounce';
import { MeetingCard } from '../components/MeetingCard';
import { MeetingFilters } from '../components/MeetingFilters';
import { CreateMeetingDialog } from '../components/CreateMeetingDialog';
import { useMeetings } from '../hooks/useMeetings';
import type { MeetingStatus } from '../types/meeting.types';

export function MeetingListPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<MeetingStatus | ''>('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 300);

  const filters = {
    page,
    limit: 12,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(status && { status }),
  };

  const { data, isLoading, isError, error } = useMeetings(workspaceId, filters);
  const meetings = data?.data ?? [];
  const meta = data?.meta;

  if (!workspaceId) {
    return <ErrorAlert message="Workspace not found" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Meetings</h2>
          <p className="text-muted-foreground">Manage meeting records and transcripts.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="min-h-10 shrink-0">
          <Plus className="h-4 w-4" aria-hidden="true" />
          New meeting
        </Button>
      </div>

      <MeetingFilters
        search={search}
        status={status}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onStatusChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
      />

      {isLoading && (
        <div className="flex justify-center py-16">
          <LoadingSpinner label="Loading meetings" />
        </div>
      )}

      {isError && (
        <ErrorAlert message={getApiErrorMessage(error, 'Failed to load meetings')} />
      )}

      {!isLoading && !isError && meetings.length === 0 && (
        <EmptyState
          title="No meetings yet"
          description="Create your first meeting to upload a transcript and generate AI notes."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New meeting
            </Button>
          }
        />
      )}

      {!isLoading && meetings.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {meetings.map((meeting) => (
              <MeetingCard key={meeting.id} workspaceId={workspaceId} meeting={meeting} />
            ))}
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Page {meta.page} of {meta.totalPages} · {meta.total} meetings
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <CreateMeetingDialog
        workspaceId={workspaceId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}
