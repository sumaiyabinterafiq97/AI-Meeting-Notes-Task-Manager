import { InsightCard } from '@/components/ai/InsightCard';
import type { MeetingDecision } from '../types/insights.types';

interface DecisionsListProps {
  decisions: MeetingDecision[];
}

export function DecisionsList({ decisions }: DecisionsListProps) {
  if (decisions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No formal decisions were identified in this meeting.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {decisions.map((decision, index) => (
        <li key={`${decision.text}-${index}`}>
          <InsightCard
            title={decision.text}
            badge={`Decision ${index + 1}`}
            expandable
            defaultExpanded={index === 0}
          >
            {decision.context && (
              <p className="text-sm text-muted-foreground">{decision.context}</p>
            )}
          </InsightCard>
        </li>
      ))}
    </ul>
  );
}
