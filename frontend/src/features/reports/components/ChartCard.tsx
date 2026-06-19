import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  ariaLabel: string;
}

export function ChartCard({
  title,
  description,
  children,
  className,
  ariaLabel,
}: ChartCardProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div role="img" aria-label={ariaLabel}>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
