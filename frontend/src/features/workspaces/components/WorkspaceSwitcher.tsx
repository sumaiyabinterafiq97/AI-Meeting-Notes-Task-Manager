import { useNavigate, useParams } from 'react-router-dom';
import { ChevronsUpDown, Plus } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useWorkspaceContext } from '../hooks/useWorkspaceContext';

export function WorkspaceSwitcher() {
  const navigate = useNavigate();
  const { workspaceId: routeWorkspaceId } = useParams<{ workspaceId: string }>();
  const { workspaces, currentWorkspace, setActiveWorkspaceId } = useWorkspaceContext();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeId = routeWorkspaceId ?? currentWorkspace?.id;
  const activeWorkspace = workspaces.find((ws) => ws.id === activeId) ?? currentWorkspace;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (id: string) => {
    setActiveWorkspaceId(id);
    setOpen(false);
    navigate(ROUTES.CHAT(id));
  };

  if (!workspaces.length) {
    return (
      <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.WORKSPACES)}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Create workspace
      </Button>
    );
  }

  return (
    <div ref={containerRef} className="relative min-w-0 w-full">
      <Button
        variant="outline"
        size="sm"
        className="h-9 w-full min-w-0 justify-between gap-1 px-2 sm:px-3 xl:w-auto xl:min-w-[160px] xl:max-w-[220px]"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Switch workspace"
      >
        <span className="truncate">{activeWorkspace?.name ?? 'Select workspace'}</span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
      </Button>

      {open && (
        <ul
          role="listbox"
          aria-label="Workspaces"
          className="absolute left-0 top-full z-50 mt-1 w-[min(calc(100vw-1.5rem),280px)] rounded-md border bg-card py-1 shadow-lg sm:w-[280px]"
        >
          {workspaces.map((workspace) => (
            <li key={workspace.id} role="option" aria-selected={workspace.id === activeId}>
              <button
                type="button"
                className={cn(
                  'flex w-full items-center px-3 py-2 text-left text-sm hover:bg-accent',
                  workspace.id === activeId && 'bg-accent font-medium',
                )}
                onClick={() => handleSelect(workspace.id)}
              >
                <span className="truncate">{workspace.name}</span>
              </button>
            </li>
          ))}
          <li className="border-t">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => {
                setOpen(false);
                navigate(ROUTES.WORKSPACES);
              }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              All workspaces
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
