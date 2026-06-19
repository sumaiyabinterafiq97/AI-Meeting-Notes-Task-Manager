import { Link } from 'react-router-dom';
import { BookOpen, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants';

interface InsightsQuickLinksProps {
  workspaceId: string;
}

export function InsightsQuickLinks({ workspaceId }: InsightsQuickLinksProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" className="gap-2" asChild>
        <Link to={ROUTES.SEARCH(workspaceId)}>
          <Search className="h-4 w-4" aria-hidden="true" />
          Semantic search
        </Link>
      </Button>
      <Button variant="outline" size="sm" className="gap-2" asChild>
        <Link to={ROUTES.KNOWLEDGE(workspaceId)}>
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          Knowledge base
        </Link>
      </Button>
    </div>
  );
}
