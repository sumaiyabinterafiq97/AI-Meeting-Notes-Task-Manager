import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SlideOver } from '@/components/common/SlideOver';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { workspaceNavItems } from './nav-items';

interface MobileNavProps {
  workspaceId: string;
}

export function MobileNav({ workspaceId }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const handleNavigate = () => {
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0 xl:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={open}
      >
        <Menu className="h-4 w-4" aria-hidden="true" />
      </Button>

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title="Menu"
        description="Switch workspace or view all workspaces"
      >
        <nav className="space-y-1" aria-label="Main navigation">
          {workspaceNavItems.map((item) => {
            const path = item.path(workspaceId);
            const isActive = location.pathname === path;

            return (
              <Link
                key={item.label}
                to={path}
                onClick={handleNavigate}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'block rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 border-t pt-4">
          <Link
            to={ROUTES.WORKSPACES}
            onClick={handleNavigate}
            className="block rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            All workspaces
          </Link>
        </div>
      </SlideOver>
    </>
  );
}
