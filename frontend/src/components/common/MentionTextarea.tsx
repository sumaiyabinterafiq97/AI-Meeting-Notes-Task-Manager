import { useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  filterMembersForMention,
  getMentionContext,
  insertMention,
  memberToMentionToken,
  type MentionableMember,
} from '@/lib/mentions';

interface MentionTextareaProps extends Omit<React.ComponentProps<'textarea'>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  members: MentionableMember[];
  excludeUserId?: string;
}

export function MentionTextarea({
  value,
  onChange,
  members,
  excludeUserId,
  className,
  onKeyDown,
  ...props
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const suggestions = filterMembersForMention(members, mentionQuery, excludeUserId);
  const showSuggestions = mentionStart !== null && suggestions.length > 0;
  const highlightedIndex =
    suggestions.length > 0 ? Math.min(selectedIndex, suggestions.length - 1) : 0;

  const updateMentionState = () => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const context = getMentionContext(value, textarea.selectionStart);
    if (!context) {
      setMentionStart(null);
      setMentionQuery('');
      setSelectedIndex(0);
      return;
    }

    if (context.query !== mentionQuery) {
      setSelectedIndex(0);
    }

    setMentionStart(context.start);
    setMentionQuery(context.query);
  };

  const applyMention = (member: MentionableMember) => {
    const textarea = textareaRef.current;
    if (!textarea || mentionStart === null) {
      return;
    }

    const token = memberToMentionToken(member.displayName);
    const { nextValue, nextCursor } = insertMention(
      value,
      mentionStart,
      textarea.selectionStart,
      token,
    );

    onChange(nextValue);
    setMentionStart(null);
    setMentionQuery('');

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
    requestAnimationFrame(updateMentionState);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }

      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        applyMention(suggestions[highlightedIndex]);
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setMentionStart(null);
        setMentionQuery('');
        return;
      }
    }

    onKeyDown?.(event);
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={updateMentionState}
        onKeyUp={updateMentionState}
        className={className}
        {...props}
      />

      {showSuggestions && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label="Mention suggestions"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-auto rounded-md border bg-card py-1 shadow-lg"
        >
          {suggestions.map((member, index) => (
            <li key={member.userId} role="option" aria-selected={index === highlightedIndex}>
              <button
                type="button"
                className={cn(
                  'flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-accent',
                  index === highlightedIndex && 'bg-accent',
                )}
                onMouseDown={(event) => {
                  event.preventDefault();
                  applyMention(member);
                }}
              >
                <span className="font-medium">{member.displayName}</span>
                <span className="text-xs text-muted-foreground">@{memberToMentionToken(member.displayName)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
