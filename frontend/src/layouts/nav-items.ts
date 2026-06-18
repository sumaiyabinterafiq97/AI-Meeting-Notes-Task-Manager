import { ROUTES } from '@/lib/constants';

export const workspaceNavItems = [
  { label: 'Dashboard', path: (id: string) => ROUTES.DASHBOARD(id) },
  { label: 'Meetings', path: (id: string) => ROUTES.MEETINGS(id) },
  { label: 'Tasks', path: (id: string) => ROUTES.TASKS(id) },
  { label: 'Settings', path: (id: string) => ROUTES.SETTINGS(id) },
] as const;
