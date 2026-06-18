import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, CheckSquare, Settings } from 'lucide-react';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';

const bottomNavItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: (id: string) => ROUTES.DASHBOARD(id) },
  { label: 'Meetings', icon: FileText, path: (id: string) => ROUTES.MEETINGS(id) },
  { label: 'Tasks', icon: CheckSquare, path: (id: string) => ROUTES.TASKS(id) },
  { label: 'Settings', icon: Settings, path: (id: string) => ROUTES.SETTINGS(id) },
] as const;

interface MobileBottomNavProps {
  workspaceId: string;
}

export function MobileBottomNav({ workspaceId }: MobileBottomNavProps) {
  const location = useLocation();

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 xl:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {bottomNavItems.map((item) => {
          const path = item.path(workspaceId);
          const isActive = location.pathname === path;
          const Icon = item.icon;

          return (
            <li key={item.label}>
              <Link
                to={path}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium sm:text-xs',
                  isActive ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <Icon className={cn('h-5 w-5', isActive && 'text-primary')} aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
