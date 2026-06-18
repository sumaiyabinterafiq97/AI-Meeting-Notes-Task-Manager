import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { getApiErrorMessage } from '@/lib/api-errors';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useNotificationPreferences } from '../hooks/useNotificationPreferences';
import { useUpdateNotificationPreferences } from '../hooks/useUpdateNotificationPreferences';
import type { NotificationPreferenceKey } from '../types/notification.types';

const preferenceOptions: {
  key: NotificationPreferenceKey;
  label: string;
  description: string;
}[] = [
  {
    key: 'inAppMentions',
    label: 'In-app @mentions',
    description: 'Show in-app notifications when someone mentions you in a comment.',
  },
  {
    key: 'emailTaskAssigned',
    label: 'Email when assigned',
    description: 'Receive an email when a task is assigned to you.',
  },
  {
    key: 'emailDueSoon',
    label: 'Email due date reminders',
    description: 'Receive email reminders before tasks are due.',
  },
];

export function NotificationPreferencesForm() {
  const { data: preferences, isLoading, isError, error } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreferences();

  const handleToggle = (key: NotificationPreferenceKey, checked: boolean) => {
    updateMutation.mutate({ [key]: checked });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner label="Loading preferences" />
      </div>
    );
  }

  if (isError || !preferences) {
    return (
      <ErrorAlert
        message={getApiErrorMessage(error, 'Failed to load notification preferences')}
      />
    );
  }

  return (
    <div className="space-y-4">
      {updateMutation.isError && (
        <ErrorAlert
          message={getApiErrorMessage(
            updateMutation.error,
            'Failed to update notification preferences',
          )}
        />
      )}

      <ul className="space-y-4">
        {preferenceOptions.map((option) => {
          const inputId = `pref-${option.key}`;
          const isChecked = preferences[option.key];
          const isUpdating =
            updateMutation.isPending && updateMutation.variables?.[option.key] !== undefined;

          return (
            <li
              key={option.key}
              className="flex items-start gap-3 rounded-lg border p-4"
            >
              <input
                id={inputId}
                type="checkbox"
                checked={isChecked}
                disabled={updateMutation.isPending}
                onChange={(event) => handleToggle(option.key, event.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 rounded border border-input"
                aria-describedby={`${inputId}-description`}
              />
              <div className="min-w-0 flex-1">
                <Label htmlFor={inputId} className={cn('cursor-pointer', isUpdating && 'opacity-70')}>
                  {option.label}
                </Label>
                <p id={`${inputId}-description`} className="mt-1 text-sm text-muted-foreground">
                  {option.description}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function NotificationPreferencesPage() {
  return (
    <div className="min-h-screen bg-muted/40 p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <Link
            to={ROUTES.WORKSPACES}
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            ← Back to workspaces
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Notification preferences</h1>
          <p className="text-muted-foreground">
            Choose how you want to be notified about tasks and mentions.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Changes are saved automatically when you toggle a setting.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationPreferencesForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
