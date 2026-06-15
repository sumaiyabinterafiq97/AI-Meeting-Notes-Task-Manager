import { Outlet, Link, useParams } from 'react-router-dom';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', path: (id: string) => ROUTES.DASHBOARD(id) },
  { label: 'Meetings', path: (id: string) => ROUTES.MEETINGS(id) },
  { label: 'Tasks', path: (id: string) => ROUTES.TASKS(id) },
  { label: 'Settings', path: (id: string) => ROUTES.SETTINGS(id) },
];

export function AppLayout() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const activeWorkspaceId = workspaceId ?? 'demo';

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-card">
        <div className="border-b p-4">
          <h1 className="text-lg font-semibold">{APP_NAME}</h1>
        </div>
        <nav className="space-y-1 p-4">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.path(activeWorkspaceId)}
              className={cn(
                'block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center border-b px-6">
          <span className="text-sm text-muted-foreground">Workspace</span>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
