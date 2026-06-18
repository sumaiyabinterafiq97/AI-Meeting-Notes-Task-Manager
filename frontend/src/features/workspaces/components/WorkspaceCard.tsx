import { Link } from 'react-router-dom';
import { Users, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ROUTES } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import { RoleBadge } from './RoleBadge';
import type { WorkspaceListItem } from '../types/workspace.types';

interface WorkspaceCardProps {
  workspace: WorkspaceListItem;
  onSelect: (workspaceId: string) => void;
}

export function WorkspaceCard({ workspace, onSelect }: WorkspaceCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-lg">{workspace.name}</CardTitle>
            <CardDescription className="truncate">/{workspace.slug}</CardDescription>
          </div>
          <RoleBadge role={workspace.role} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {workspace.memberCount} member{workspace.memberCount !== 1 ? 's' : ''}
          </span>
          <span aria-hidden="true">·</span>
          <span>Created {formatDate(workspace.createdAt)}</span>
        </div>
        <button
          type="button"
          onClick={() => onSelect(workspace.id)}
          className="flex w-full items-center justify-between rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Open workspace
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
        {workspace.role === 'OWNER' && (
          <Link
            to={ROUTES.SETTINGS(workspace.id)}
            className="block text-center text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            Workspace settings
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
