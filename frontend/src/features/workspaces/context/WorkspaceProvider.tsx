import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useWorkspaces } from '../hooks/useWorkspaces';
import { WorkspaceContext, type WorkspaceContextValue } from './workspace-context';

const ACTIVE_WORKSPACE_KEY = 'activeWorkspaceId';

function readStoredWorkspaceId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_WORKSPACE_KEY);
  } catch {
    return null;
  }
}

function writeStoredWorkspaceId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_WORKSPACE_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
    }
  } catch {
    // Ignore storage errors (private browsing, etc.)
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { data: workspaces = [], isLoading, isError, error } = useWorkspaces(isAuthenticated);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(
    readStoredWorkspaceId,
  );

  const setActiveWorkspaceId = useCallback((id: string | null) => {
    setActiveWorkspaceIdState(id);
    writeStoredWorkspaceId(id);
  }, []);

  const resolvedActiveWorkspaceId = useMemo(() => {
    if (!workspaces.length) {
      return null;
    }

    if (activeWorkspaceId && workspaces.some((ws) => ws.id === activeWorkspaceId)) {
      return activeWorkspaceId;
    }

    return workspaces[0]!.id;
  }, [workspaces, activeWorkspaceId]);

  useEffect(() => {
    writeStoredWorkspaceId(resolvedActiveWorkspaceId);
  }, [resolvedActiveWorkspaceId]);

  const currentWorkspace = useMemo(
    () => workspaces.find((ws) => ws.id === resolvedActiveWorkspaceId) ?? null,
    [workspaces, resolvedActiveWorkspaceId],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      activeWorkspaceId: resolvedActiveWorkspaceId,
      setActiveWorkspaceId,
      workspaces,
      currentWorkspace,
      isLoading,
      isError,
      error: error ?? null,
    }),
    [
      resolvedActiveWorkspaceId,
      setActiveWorkspaceId,
      workspaces,
      currentWorkspace,
      isLoading,
      isError,
      error,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
