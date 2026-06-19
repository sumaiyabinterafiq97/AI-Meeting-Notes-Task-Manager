import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ActionItemReview } from '@/features/meetings/components/ActionItemReview';
import type { ActionItem, MeetingAiOutput, MeetingStatus } from '@/features/meetings/types/meeting.types';
import { parseMeetingInsights } from '../lib/parse-meeting-insights';
import { SummarySection } from './SummarySection';
import { DecisionsList } from './DecisionsList';
import { RisksList } from './RisksList';
import { RecommendationsList } from './RecommendationsList';
import { KnowledgeLinksSection } from './KnowledgeLinksSection';

interface MeetingInsightsPanelProps {
  workspaceId: string;
  meetingId: string;
  meetingStatus: MeetingStatus;
  aiOutput: MeetingAiOutput | null;
  actionItems: ActionItem[];
  embedded?: boolean;
}

function tabLabel(label: string, count: number): string {
  return count > 0 ? `${label} (${count})` : label;
}

export function MeetingInsightsPanel({
  workspaceId,
  meetingId,
  meetingStatus,
  aiOutput,
  actionItems,
  embedded = false,
}: MeetingInsightsPanelProps) {
  const insights = useMemo(
    () => parseMeetingInsights(aiOutput, actionItems),
    [aiOutput, actionItems],
  );

  const isProcessing = meetingStatus === 'PROCESSING';
  const pendingActionCount = actionItems.filter((item) => item.status === 'PENDING').length;

  const showPanel =
    meetingStatus === 'READY' ||
    meetingStatus === 'PROCESSING' ||
    meetingStatus === 'FAILED' ||
    actionItems.length > 0;

  if (!showPanel) {
    return null;
  }

  const panelBody = (
    <>
      {isProcessing && (
        <div className="mb-4 flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900 dark:bg-blue-950/20">
          <LoadingSpinner className="h-5 w-5" label="Generating insights" />
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Insights update automatically when processing finishes.
          </p>
        </div>
      )}

      <Tabs defaultValue="summary">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="actions">
            {tabLabel('Actions', pendingActionCount)}
          </TabsTrigger>
          <TabsTrigger value="decisions">
            {tabLabel('Decisions', insights.decisions.length)}
          </TabsTrigger>
          <TabsTrigger value="risks">{tabLabel('Risks', insights.risks.length)}</TabsTrigger>
          <TabsTrigger value="recommendations">
            {tabLabel('Tips', insights.recommendations.length)}
          </TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <SummarySection
            summary={insights.summary}
            topics={insights.topics}
            processedAt={insights.processedAt}
            modelVersion={insights.modelVersion}
          />
        </TabsContent>

        <TabsContent value="actions">
          <ActionItemReview
            workspaceId={workspaceId}
            meetingId={meetingId}
            actionItems={actionItems}
          />
        </TabsContent>

        <TabsContent value="decisions">
          <DecisionsList decisions={insights.decisions} />
        </TabsContent>

        <TabsContent value="risks">
          <RisksList risks={insights.risks} />
        </TabsContent>

        <TabsContent value="recommendations">
          <RecommendationsList recommendations={insights.recommendations} />
        </TabsContent>

        <TabsContent value="knowledge">
          <KnowledgeLinksSection workspaceId={workspaceId} meetingId={meetingId} />
        </TabsContent>
      </Tabs>
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{panelBody}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meeting Insights</CardTitle>
        <CardDescription>
          AI-generated summary, decisions, risks, and follow-ups from this meeting.
        </CardDescription>
      </CardHeader>
      <CardContent>{panelBody}</CardContent>
    </Card>
  );
}
