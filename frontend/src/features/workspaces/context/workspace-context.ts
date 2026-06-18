import { createContext } from 'react';
import type { WorkspaceListItem } from '../types/workspace.types';

export interface WorkspaceContextValue {
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string | null) => void;
  workspaces: WorkspaceListItem[];
  currentWorkspace: WorkspaceListItem | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
