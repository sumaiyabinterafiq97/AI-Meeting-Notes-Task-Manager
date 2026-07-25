import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';
import type { MeetingTranscriptMeta } from '../types/meeting.types';

interface TranscriptDocumentProps {
  title: string;
  transcript: MeetingTranscriptMeta;
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'meeting-transcript'
  );
}

export function TranscriptDocument({ title, transcript }: TranscriptDocumentProps) {
  const content = transcript.content?.trim() ?? '';
  const baseName = slugify(title);

  const handleDownloadTxt = () => {
    downloadTextFile(`${baseName}.txt`, content, 'text/plain;charset=utf-8');
  };

  const handleDownloadMd = () => {
    const markdown = `# ${title}\n\n_Uploaded ${formatDateTime(transcript.uploadedAt)}_\n\n${content}\n`;
    downloadTextFile(`${baseName}.md`, markdown, 'text/markdown;charset=utf-8');
  };

  if (!content) {
    return (
      <p className="text-sm text-muted-foreground">
        Transcript metadata is available, but the full text could not be loaded. Try refreshing the
        page.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {transcript.charCount.toLocaleString()} characters ·{' '}
          {transcript.sourceFormat.toUpperCase()} · Uploaded {formatDateTime(transcript.uploadedAt)}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleDownloadTxt}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Download .txt
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleDownloadMd}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Download .md
          </Button>
        </div>
      </div>

      <article
        className="max-h-[min(70dvh,720px)] overflow-y-auto rounded-lg border bg-muted/20 p-4 sm:p-6"
        aria-label="Meeting transcript"
      >
        <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-foreground">
          {content}
        </pre>
      </article>
    </div>
  );
}
