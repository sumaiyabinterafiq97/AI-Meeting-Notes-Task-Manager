import { Outlet, Link, useParams, useLocation } from 'react-router-dom';
import { LogOut, MessageSquare } from 'lucide-react';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { WorkspaceSwitcher } from '@/features/workspaces/components/WorkspaceSwitcher';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { GlobalSearch } from '@/features/search/components/GlobalSearch';
import { MobileSearch } from '@/features/search/components/MobileSearch';
import { MobileNav } from '@/layouts/MobileNav';
import { MobileBottomNav } from '@/layouts/MobileBottomNav';
import { isNavItemActive, workspaceNavItems } from '@/layouts/nav-items';

export function AppLayout() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const location = useLocation();
  const { user, logout } = useAuth();
  const activeWorkspaceId = workspaceId ?? '';

  const handleLogout = () => {
    void logout();
  };

  return (
    <div className="flex min-h-dvh w-full overflow-x-clip bg-background">
      <aside className="hidden w-64 shrink-0 border-r bg-card xl:block">
        <div className="border-b p-4">
          <Link to={ROUTES.WORKSPACES} className="text-lg font-semibold hover:underline">
            {APP_NAME}
          </Link>
        </div>
        <nav className="space-y-1 p-4" aria-label="Main navigation">
          {workspaceNavItems.map((item) => {
            const path = item.path(activeWorkspaceId);
            const isActive = isNavItemActive(location.pathname, activeWorkspaceId, item);

            return (
              <Link
                key={item.label}
                to={path}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
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
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex h-14 items-center gap-2 px-3 sm:px-4 xl:px-6">
            {activeWorkspaceId && (
              <div className="shrink-0 xl:hidden">
                <MobileNav workspaceId={activeWorkspaceId} />
              </div>
            )}

            <div className="min-w-0 flex-1 xl:max-w-md">
              <WorkspaceSwitcher />
            </div>

            {activeWorkspaceId && (
              <div className="hidden min-w-0 flex-1 xl:block xl:max-w-md">
                <GlobalSearch workspaceId={activeWorkspaceId} />
              </div>
            )}

            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
              {activeWorkspaceId && (
                <>
                  <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 xl:hidden" asChild>
                    <Link to={ROUTES.CHAT(activeWorkspaceId)} aria-label="Workspace chat">
                      <MessageSquare className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <div className="xl:hidden">
                    <MobileSearch workspaceId={activeWorkspaceId} />
                  </div>
                </>
              )}
              <NotificationBell />
              {user && (
                <span className="hidden max-w-[6rem] truncate text-sm text-muted-foreground lg:inline xl:max-w-none">
                  {user.displayName}
                </span>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={handleLogout}
                aria-label="Sign out"
                className="h-9 w-9 shrink-0"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 w-full p-4 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] xl:p-6 xl:pb-6">
          <Outlet />
        </main>

        {activeWorkspaceId && <MobileBottomNav workspaceId={activeWorkspaceId} />}
      </div>
    </div>
  );
}
