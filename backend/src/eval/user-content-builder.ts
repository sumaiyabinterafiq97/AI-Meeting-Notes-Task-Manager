import { inputSanitizerService } from '../modules/agents/security/input-sanitizer.service';
import type { SuiteConfig } from './suite-config';

function asString(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  return String(value);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item));
}

export function buildTemplateVariables(
  suite: SuiteConfig,
  input: Record<string, unknown>,
): Record<string, string> {
  switch (suite.schemaKey) {
    case 'summarizer':
      return {
        transcript: asString(input.transcript),
        meetingTitle: asString(input.meetingTitle, 'Meeting'),
        memberNames: asStringArray(input.memberNames).join(', ') || 'Unknown',
        meetingDate: asString(input.meetingDate, '2026-01-01'),
      };
    case 'task-extractor':
      return {
        transcript: asString(input.transcript),
        memberNames: asStringArray(input.memberNames).join(', ') || 'Unknown',
        summary: asString(input.summary),
      };
    case 'decision':
      return {
        transcript: asString(input.transcript),
        memberNames: asStringArray(input.memberNames).join(', ') || 'Unknown',
        summary: asString(input.summary),
      };
    case 'risk-analyzer':
      return {
        transcript: asString(input.transcript),
        summary: asString(input.summary),
      };
    case 'knowledge':
      return {
        mergedOutput: asString(input.mergedOutput, '{}'),
        transcript: asString(input.transcript),
        meetingTitle: asString(input.meetingTitle, 'Meeting'),
      };
    case 'weekly-report':
      return {
        workspaceName: asString(input.workspaceName, 'Workspace'),
        dateFrom: asString(input.dateFrom, '2026-01-01'),
        dateTo: asString(input.dateTo, '2026-01-07'),
        meetingSummaries: asString(input.meetingSummaries),
        openRisks: asString(input.openRisks),
        retrievedContext: asString(input.retrievedContext),
      };
    case 'chat':
      return {
        workspaceName: asString(input.workspaceName, 'Workspace'),
        scope: asString(input.scope, 'workspace'),
        userMessage: asString(input.userMessage),
        contextBlocks: asString(input.contextBlocks),
      };
    default:
      return {};
  }
}

export function buildUserContent(suite: SuiteConfig, input: Record<string, unknown>): string {
  const transcript = asString(input.transcript);
  const memberNames = asStringArray(input.memberNames);
  const memberList = memberNames.length > 0 ? memberNames.join(', ') : 'Unknown';

  switch (suite.schemaKey) {
    case 'summarizer':
      return [
        `Meeting title: ${asString(input.meetingTitle, 'Meeting')}`,
        `Meeting date: ${asString(input.meetingDate, '2026-01-01')}`,
        `Attendees: ${memberList}`,
        '',
        'Transcript:',
        transcript,
      ].join('\n');

    case 'task-extractor':
      return [
        `Workspace members: ${memberList}`,
        input.summary ? `Meeting summary (disambiguation only):\n${asString(input.summary)}` : '',
        '',
        'Transcript:',
        transcript,
      ]
        .filter(Boolean)
        .join('\n');

    case 'decision':
      return [
        `Attendees: ${memberList}`,
        input.summary ? `Meeting summary (disambiguation only):\n${asString(input.summary)}` : '',
        '',
        'Transcript:',
        transcript,
      ]
        .filter(Boolean)
        .join('\n');

    case 'risk-analyzer': {
      const decisions = Array.isArray(input.decisions)
        ? (input.decisions as Array<{ text?: string; context?: string }>)
            .map((d) => `- ${d.text ?? ''} (${d.context ?? ''})`)
            .join('\n')
        : '';
      return [
        input.summary ? `Meeting summary (context only):\n${asString(input.summary)}` : '',
        decisions ? `Decisions (context only):\n${decisions}` : '',
        '',
        'Transcript:',
        transcript,
      ]
        .filter(Boolean)
        .join('\n');
    }

    case 'knowledge': {
      const decisions = Array.isArray(input.decisions)
        ? (input.decisions as Array<{ text?: string; context?: string }>)
        : [];
      const decisionsText = decisions.map((d) => `- ${d.text}: ${d.context}`).join('\n');
      return [
        input.meetingTitle ? `Meeting: ${asString(input.meetingTitle)}` : '',
        `Summary:\n${asString(input.summary, asString(input.mergedOutput))}`,
        decisionsText ? `Decisions:\n${decisionsText}` : '',
        '',
        'Transcript excerpt:',
        transcript.slice(0, 4000),
      ]
        .filter(Boolean)
        .join('\n');
    }

    case 'weekly-report': {
      const taskStats =
        typeof input.taskStats === 'string'
          ? input.taskStats
          : JSON.stringify(input.taskStats ?? {});
      return [
        `Period: ${asString(input.dateFrom)} to ${asString(input.dateTo)}`,
        `Meeting count: ${asString(input.meetingCount, '0')}`,
        `Task stats: ${taskStats}`,
        '',
        'Meeting summaries:',
        asString(input.meetingSummaries, 'No meetings in period.'),
        '',
        'Open risks:',
        asString(input.openRisks, 'None recorded.'),
        '',
        'Retrieved context:',
        asString(input.retrievedContext, 'No additional context retrieved.'),
      ].join('\n');
    }

    case 'chat':
      return [
        `Workspace: ${asString(input.workspaceName, 'Workspace')}`,
        `Scope: ${asString(input.scope, 'workspace')}`,
        '',
        'Retrieved context:',
        asString(input.contextBlocks, 'No relevant meeting context was retrieved.'),
        '',
        `User question: ${asString(input.userMessage)}`,
      ].join('\n');

    default:
      return JSON.stringify(input);
  }
}

export function isEmptyTranscript(input: Record<string, unknown>): boolean {
  const transcript = asString(input.transcript).trim();
  return transcript.length === 0;
}

export function wrapUserContent(content: string): string {
  return inputSanitizerService.wrapUntrustedContent('USER_INPUT', content);
}
