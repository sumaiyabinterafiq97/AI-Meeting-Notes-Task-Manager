import { Input } from '@/components/ui/input';
import type { MeetingStatus } from '../types/meeting.types';

interface MeetingFiltersProps {
  search: string;
  status: MeetingStatus | '';
  onSearchChange: (value: string) => void;
  onStatusChange: (value: MeetingStatus | '') => void;
}

const STATUS_OPTIONS: Array<{ value: MeetingStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'READY', label: 'Ready' },
  { value: 'FAILED', label: 'Failed' },
];

export function MeetingFilters({
  search,
  status,
  onSearchChange,
  onStatusChange,
}: MeetingFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Input
        type="search"
        placeholder="Search meetings…"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        className="sm:max-w-xs"
        aria-label="Search meetings"
      />
      <select
        value={status}
        onChange={(event) => onStatusChange(event.target.value as MeetingStatus | '')}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        aria-label="Filter by status"
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value || 'all'} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
