import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { getApiErrorMessage } from '@/lib/api-errors';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useNotifications, useUnreadNotificationCount } from '../hooks/useNotifications';
import { useMarkNotificationRead } from '../hooks/useMarkNotificationRead';
import { useMarkAllNotificationsRead } from '../hooks/useMarkAllNotificationsRead';
import { NotificationItem } from './NotificationItem';
import type { Notification } from '../types/notification.types';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const {
    data: notifications,
    isLoading,
    isError,
    error,
    refetch,
  } = useNotifications(open);
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const items = notifications?.data ?? [];
  const hasUnread = unreadCount > 0;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (open) {
      void refetch();
    }
  }, [open, refetch]);

  const handleSelect = (notification: Notification) => {
    setOpen(false);

    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
  };

  const handleMarkAllRead = () => {
    if (!hasUnread || markAllReadMutation.isPending) return;
    markAllReadMutation.mutate();
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="outline"
        size="icon"
        className="relative h-9 w-9 shrink-0"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={hasUnread ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {hasUnread && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div
          role="menu"
          aria-label="Notifications"
          className="absolute right-0 top-full z-50 mt-1 w-[min(100vw-2rem,360px)] overflow-hidden rounded-md border bg-card shadow-lg"
        >
          <div className="flex items-center justify-between border-b px-3 py-2">
            <h2 className="text-sm font-semibold">Notifications</h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              disabled={!hasUnread || markAllReadMutation.isPending}
              onClick={handleMarkAllRead}
            >
              Mark all read
            </Button>
          </div>

          {isLoading && (
            <div className="flex justify-center py-8">
              <LoadingSpinner label="Loading notifications" />
            </div>
          )}

          {isError && (
            <div className="p-3">
              <ErrorAlert message={getApiErrorMessage(error, 'Failed to load notifications')} />
            </div>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          )}

          {!isLoading && !isError && items.length > 0 && (
            <ul className={cn('max-h-80 overflow-y-auto')}>
              {items.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onSelect={handleSelect}
                />
              ))}
            </ul>
          )}

          <div className="border-t px-3 py-2">
            <Link
              to={ROUTES.ACCOUNT_NOTIFICATIONS}
              onClick={() => setOpen(false)}
              className="block rounded-md px-2 py-2 text-center text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Notification settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
