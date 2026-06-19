import { InsightCard } from '@/components/ai/InsightCard';
import type { MeetingRisk } from '../types/insights.types';

interface RisksListProps {
  risks: MeetingRisk[];
}

export function RisksList({ risks }: RisksListProps) {
  if (risks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No risks or blockers were flagged for this meeting.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {risks.map((risk, index) => (
        <li key={`${risk.text}-${index}`}>
          <InsightCard
            title={risk.text}
            severity={risk.severity}
            badge="Risk"
            expandable
            defaultExpanded={risk.severity === 'high'}
          >
            {risk.context && <p className="text-sm text-muted-foreground">{risk.context}</p>}
          </InsightCard>
        </li>
      ))}
    </ul>
  );
}
