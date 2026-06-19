import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MeetingInsightsPanel } from '@/features/insights/components/MeetingInsightsPanel';
import { renderWithProviders } from '@/test/render-with-providers';

vi.mock('@/features/insights/hooks/useMeetingKnowledge', () => ({
  useMeetingKnowledge: () => ({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

vi.mock('@/features/workspaces/hooks/useWorkspaceMembers', () => ({
  useWorkspaceMembers: () => ({ data: [] }),
}));

vi.mock('@/features/meetings/hooks/useAcceptActionItems', () => ({
  useAcceptActionItems: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false }),
}));

vi.mock('@/features/meetings/hooks/useRejectActionItems', () => ({
  useRejectActionItems: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false }),
}));

const baseAiOutput = {
  id: 'ai-1',
  summary: 'Team aligned on launch timeline and vendor follow-up.',
  topics: ['Launch', 'Vendor'],
  decisions: [{ text: 'Ship Friday', context: 'Consensus after risk review' }],
  risks: [{ text: 'API vendor delay', severity: 'high' as const, context: 'Dependency risk' }],
  processingStatus: 'COMPLETED' as const,
  processedAt: '2026-06-01T10:00:00.000Z',
  modelVersion: 'gpt-4o',
};

describe('MeetingInsightsPanel', () => {
  it('renders summary tab content by default', () => {
    renderWithProviders(
      <MeetingInsightsPanel
        workspaceId="ws-1"
        meetingId="m-1"
        meetingStatus="READY"
        aiOutput={baseAiOutput}
        actionItems={[]}
      />,
    );

    expect(screen.getByRole('heading', { name: /meeting insights/i })).toBeInTheDocument();
    expect(screen.getByText(/launch timeline/i)).toBeInTheDocument();
    expect(screen.getByText('Launch')).toBeInTheDocument();
  });

  it('switches to decisions tab', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <MeetingInsightsPanel
        workspaceId="ws-1"
        meetingId="m-1"
        meetingStatus="READY"
        aiOutput={baseAiOutput}
        actionItems={[]}
      />,
    );

    await user.click(screen.getByRole('tab', { name: /decisions/i }));

    expect(screen.getByText('Ship Friday')).toBeInTheDocument();
    expect(screen.getByText(/consensus after risk review/i)).toBeInTheDocument();
  });
});
