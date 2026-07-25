import { ROUTES } from '@/lib/constants';

export const workspaceNavItems = [
  { label: 'Meetings', path: (id: string) => ROUTES.MEETINGS(id), matchPrefix: true },
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
