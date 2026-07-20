import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { getApiErrorMessage } from '@/lib/api-errors';
import { apiClient } from '@/lib/api-client';

interface CalendarConnection {
  id: string;
  provider: 'GOOGLE' | 'MICROSOFT';
  status: string;
  accountEmail: string | null;
  lastSyncAt: string | null;
}

interface CalendarConnectCardProps {
  workspaceId: string;
  canManage: boolean;
}

export function CalendarConnectCard({ workspaceId, canManage }: CalendarConnectCardProps) {
  const queryClient = useQueryClient();
  const queryKey = ['calendar-connections', workspaceId];

  const connectionsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: CalendarConnection[] }>(
        `/workspaces/${workspaceId}/calendar/connections`,
      );
      return data.data;
    },
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<{
        authorizationUrl?: string;
        connected?: boolean;
        mock?: boolean;
      }>(`/workspaces/${workspaceId}/calendar/connect/google`);
      return data;
    },
    onSuccess: (data) => {
      if (data.authorizationUrl) {
        window.location.assign(data.authorizationUrl);
        return;
      }
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      await apiClient.delete(`/workspaces/${workspaceId}/calendar/connections/${connectionId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const google = connectionsQuery.data?.find((c) => c.provider === 'GOOGLE');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Google Calendar & Meet</CardTitle>
        <CardDescription>
          Connect Google to create Calendar events with Meet links and sync upcoming meetings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {connectionsQuery.isLoading && <LoadingSpinner label="Loading calendar" />}
        {connectionsQuery.isError && (
          <ErrorAlert
            message={getApiErrorMessage(connectionsQuery.error, 'Failed to load calendar')}
          />
        )}
        {connectMutation.isError && (
          <ErrorAlert
            message={getApiErrorMessage(connectMutation.error, 'Failed to connect Google')}
          />
        )}

        {google ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Connected</p>
              <p className="text-xs text-muted-foreground">
                {google.accountEmail ?? 'Google Calendar'} · {google.status}
              </p>
            </div>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                disabled={disconnectMutation.isPending}
                onClick={() => disconnectMutation.mutate(google.id)}
              >
                Disconnect
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Not connected. Creating meetings will still work locally; Connect Google to attach
              Meet links and reminders.
            </p>
            {canManage && (
              <Button onClick={() => connectMutation.mutate()} disabled={connectMutation.isPending}>
                {connectMutation.isPending ? 'Connecting…' : 'Connect Google Calendar / Meet'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
