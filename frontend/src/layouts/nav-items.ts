import { ROUTES } from '@/lib/constants';

export const workspaceNavItems = [
  { label: 'Chat', path: (id: string) => ROUTES.CHAT(id), matchPrefix: true },
  { label: 'Insights', path: (id: string) => ROUTES.INSIGHTS(id) },
  { label: 'Search', path: (id: string) => ROUTES.SEARCH(id) },
  { label: 'Dashboard', path: (id: string) => ROUTES.DASHBOARD(id) },
  { label: 'Meetings', path: (id: string) => ROUTES.MEETINGS(id) },
  { label: 'Tasks', path: (id: string) => ROUTES.TASKS(id) },
  { label: 'Reports', path: (id: string) => ROUTES.REPORTS(id), matchPrefix: true },
  { label: 'Knowledge', path: (id: string) => ROUTES.KNOWLEDGE(id) },
  { label: 'Settings', path: (id: string) => ROUTES.SETTINGS(id) },
] as const;

export function isNavItemActive(
  pathname: string,
  workspaceId: string,
  item: (typeof workspaceNavItems)[number],
): boolean {
  const path = item.path(workspaceId);
  if ('matchPrefix' in item && item.matchPrefix) {
    return pathname === path || pathname.startsWith(`${path}/`);
  }
  return pathname === path;
}
