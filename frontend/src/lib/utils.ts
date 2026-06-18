import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(typeof date === 'string' ? new Date(date) : date);
}

export function formatRelativeDate(date: string | Date): string {
  const target = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Expired';
  if (diffDays === 0) return 'Expires today';
  if (diffDays === 1) return 'Expires tomorrow';
  return `Expires in ${diffDays} days`;
}

export function toDatetimeLocalValue(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(typeof date === 'string' ? new Date(date) : date);
}

export function toDateInputValue(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isPastDate(date: string | Date): boolean {
  const target = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compare = new Date(target);
  compare.setHours(0, 0, 0, 0);
  return compare.getTime() < today.getTime();
}
