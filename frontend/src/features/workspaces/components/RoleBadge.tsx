import { Badge } from '@/components/ui/badge';
import type { WorkspaceRole } from '../types/workspace.types';

interface RoleBadgeProps {
  role: WorkspaceRole;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <Badge variant={role === 'OWNER' ? 'owner' : 'member'} aria-label={`Role: ${role}`}>
      {role === 'OWNER' ? 'Owner' : 'Member'}
    </Badge>
  );
}
