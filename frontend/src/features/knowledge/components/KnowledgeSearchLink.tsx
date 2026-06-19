import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants';

interface KnowledgeSearchLinkProps {
  workspaceId: string;
}

export function KnowledgeSearchLink({ workspaceId }: KnowledgeSearchLinkProps) {
  return (
    <Button variant="outline" size="sm" className="gap-2" asChild>
      <Link to={ROUTES.KNOWLEDGE_SEARCH(workspaceId)}>
        <Search className="h-4 w-4" aria-hidden="true" />
        Semantic search
      </Link>
    </Button>
  );
}
