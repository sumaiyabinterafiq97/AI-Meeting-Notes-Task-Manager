import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadReportMarkdown } from './export-report';
import type { WorkspaceReport } from '../types/report.types';

const report: WorkspaceReport = {
  id: 'report-1',
  workspaceId: 'ws-1',
  periodStart: '2026-06-10T00:00:00.000Z',
  periodEnd: '2026-06-16T00:00:00.000Z',
  title: 'Weekly Report 2026-06-10',
  contentMarkdown: '# Weekly Report\n\nSummary text.',
  contentJson: {},
  status: 'COMPLETED',
  modelVersion: 'mock',
  promptTokens: 10,
  completionTokens: 20,
  generatedAt: '2026-06-16T12:00:00.000Z',
  createdAt: '2026-06-16T12:00:00.000Z',
};

describe('export-report', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:report'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates a markdown download link', () => {
    const click = vi.fn();
    const anchor = {
      href: '',
      download: '',
      click,
    };

    vi.spyOn(document, 'createElement').mockReturnValue(anchor as unknown as HTMLAnchorElement);

    downloadReportMarkdown(report);

    expect(anchor.download).toBe('weekly-report-2026-06-10.md');
    expect(click).toHaveBeenCalled();
  });
});
