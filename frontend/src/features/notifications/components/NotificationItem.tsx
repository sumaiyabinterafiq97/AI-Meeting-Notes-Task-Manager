import { Link } from 'react-router-dom';
import { cn, formatDateTime } from '@/lib/utils';
import {
  formatNotificationMessage,
  getNotificationLink,
} from '../lib/format-notification';
import type { Notification } from '../types/notification.types';

interface NotificationItemProps {
  notification: Notification;
  onSelect: (notification: Notification) => void;
}

export function NotificationItem({ notification, onSelect }: NotificationItemProps) {
  const message = formatNotificationMessage(notification);
  const link = getNotificationLink(notification);
  const timeLabel = formatDateTime(notification.createdAt);

  const content = (
    <>
      <p className={cn('text-sm leading-snug', !notification.isRead && 'font-medium')}>
        {message}
      </p>
      <time className="mt-1 block text-xs text-muted-foreground" dateTime={notification.createdAt}>
        {timeLabel}
      </time>
    </>
  );

  if (link) {
    return (
      <li>
        <Link
          to={link}
          onClick={() => onSelect(notification)}
          className={cn(
            'block px-3 py-2.5 transition-colors hover:bg-accent',
            !notification.isRead && 'bg-accent/40',
          )}
        >
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(notification)}
        className={cn(
          'block w-full px-3 py-2.5 text-left transition-colors hover:bg-accent',
          !notification.isRead && 'bg-accent/40',
        )}
      >
        {content}
      </button>
    </li>
  );
}
