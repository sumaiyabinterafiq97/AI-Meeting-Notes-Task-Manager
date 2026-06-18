import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { NotificationPreferencesForm } from '@/features/notifications/pages/NotificationPreferencesPage';
import { notificationApi } from '@/features/notifications/services/notification-api';

vi.mock('@/features/notifications/services/notification-api', () => ({
  notificationApi: {
    list: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    getPreferences: vi.fn(),
    updatePreferences: vi.fn(),
  },
}));

const defaultPreferences = {
  emailTaskAssigned: true,
  emailDueSoon: true,
  inAppMentions: true,
};

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <NotificationPreferencesForm />
    </QueryClientProvider>,
  );
}

describe('NotificationPreferencesForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationApi.getPreferences).mockResolvedValue({
      data: defaultPreferences,
    } as never);
    vi.mocked(notificationApi.updatePreferences).mockResolvedValue({
      data: { ...defaultPreferences, emailDueSoon: false },
    } as never);
  });

  it('renders notification preference toggles', async () => {
    renderForm();

    expect(await screen.findByLabelText(/in-app @mentions/i)).toBeChecked();
    expect(screen.getByLabelText(/email when assigned/i)).toBeChecked();
    expect(screen.getByLabelText(/email due date reminders/i)).toBeChecked();
  });

  it('updates preferences when a toggle changes', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(await screen.findByLabelText(/email due date reminders/i));

    await waitFor(() => {
      expect(notificationApi.updatePreferences).toHaveBeenCalledWith({ emailDueSoon: false });
    });
  });
});
