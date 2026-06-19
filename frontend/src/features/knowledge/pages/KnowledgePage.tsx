import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { EmptyState } from '@/components/common/EmptyState';
import { SlideOver } from '@/components/common/SlideOver';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useKnowledgeEntries } from '../hooks/useKnowledgeEntries';
import { filterKnowledgeEntries, getDecisionTimelineEntries } from '../lib/knowledge-utils';
import type { KnowledgeEntityType } from '../types/knowledge.types';
import { KnowledgeFilters } from '../components/KnowledgeFilters';
import { KnowledgeEntryCard } from '../components/KnowledgeEntryCard';
import { KnowledgeDetailPanel } from '../components/KnowledgeDetailPanel';
import { DecisionTimeline } from '../components/DecisionTimeline';
import { KnowledgeSearchLink } from '../components/KnowledgeSearchLink';

export function KnowledgePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState<KnowledgeEntityType | 'ALL'>('ALL');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const apiEntityType = entityType === 'ALL' ? undefined : entityType;
  const { data: entries = [], isLoading, isError, error } = useKnowledgeEntries(
    workspaceId,
    apiEntityType,
  );

  const filteredEntries = useMemo(
    () => filterKnowledgeEntries(entries, search),
    [entries, search],
  );

  const decisionEntries = useMemo(() => getDecisionTimelineEntries(entries), [entries]);

  if (!workspaceId) {
    return <ErrorAlert message="Workspace not found" />;
  }

  const handleSelectEntry = (entryId: string) => {
    setSelectedEntryId(entryId);
    setMobileDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Knowledge Base</h2>
          <p className="text-muted-foreground">
            Persistent workspace memory extracted from meetings — decisions, people, projects, and
            more.
          </p>
        </div>
        <KnowledgeSearchLink workspaceId={workspaceId} />
      </div>

      <KnowledgeFilters
        search={search}
        entityType={entityType}
        onSearchChange={setSearch}
        onEntityTypeChange={setEntityType}
      />

      {isLoading && (
        <div className="flex justify-center py-16">
          <LoadingSpinner label="Loading knowledge entries" />
        </div>
      )}

      {isError && (
        <ErrorAlert message={getApiErrorMessage(error, 'Failed to load knowledge entries')} />
      )}

      {!isLoading && !isError && filteredEntries.length === 0 && (
        <EmptyState
          title="No knowledge entries"
          description="Entries appear after meetings are processed with knowledge extraction enabled."
        />
      )}

      {!isLoading && !isError && filteredEntries.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] xl:grid-cols-[minmax(0,1fr)_28rem]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredEntries.map((entry) => (
                <KnowledgeEntryCard
                  key={entry.id}
                  entry={entry}
                  isSelected={entry.id === selectedEntryId}
                  onSelect={handleSelectEntry}
                />
              ))}
            </div>

            <section className="rounded-lg border bg-card p-4">
              <div className="mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-violet-600" aria-hidden="true" />
                <h3 className="text-lg font-semibold">Decision timeline</h3>
              </div>
              <DecisionTimeline workspaceId={workspaceId} entries={decisionEntries} />
            </section>
          </div>

          <div className="hidden lg:block">
            <KnowledgeDetailPanel workspaceId={workspaceId} entryId={selectedEntryId} />
          </div>
        </div>
      )}

      <SlideOver
        open={mobileDetailOpen && Boolean(selectedEntryId)}
        onClose={() => setMobileDetailOpen(false)}
        title="Knowledge entry"
        side="right"
        className="w-[min(92vw,24rem)]"
      >
        <KnowledgeDetailPanel workspaceId={workspaceId} entryId={selectedEntryId} />
      </SlideOver>
    </div>
  );
}
