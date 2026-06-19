import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type InsightSeverity = 'low' | 'medium' | 'high';

const severityStyles: Record<InsightSeverity, string> = {
  low: 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20',
  medium: 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20',
  high: 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20',
};

interface InsightCardProps {
  title: string;
  description?: string;
  badge?: string;
  severity?: InsightSeverity;
  expandable?: boolean;
  defaultExpanded?: boolean;
  children?: ReactNode;
  className?: string;
}

export function InsightCard({
  title,
  description,
  badge,
  severity,
  expandable = false,
  defaultExpanded = false,
  children,
  className,
}: InsightCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasDetails = Boolean(children);
  const canExpand = expandable && hasDetails;

  return (
    <Card
      className={cn(severity ? severityStyles[severity] : undefined, className)}
      data-severity={severity}
    >
      <CardHeader className={cn('pb-2', canExpand && 'cursor-pointer')} onClick={() => canExpand && setExpanded((prev) => !prev)}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base font-medium">{title}</CardTitle>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {badge && <Badge variant="secondary">{badge}</Badge>}
            {severity && (
              <Badge variant="outline" className="capitalize">
                {severity}
              </Badge>
            )}
            {canExpand && (
              <ChevronDown
                className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded && 'rotate-180')}
                aria-hidden="true"
              />
            )}
          </div>
        </div>
      </CardHeader>
      {hasDetails && (!canExpand || expanded) && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}
