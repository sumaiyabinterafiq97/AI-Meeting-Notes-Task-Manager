import { prisma } from '../../../config/database';
import type { ChunkInput } from '../types/chunk.types';

interface MeetingDecision {
  text?: string;
  context?: string;
}

interface MeetingRisk {
  text?: string;
  severity?: string;
  context?: string;
}

export async function buildMeetingChunkInputs(meetingId: string): Promise<ChunkInput[]> {
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, deletedAt: null },
    include: {
      transcript: true,
      aiOutput: true,
      actionItems: true,
    },
  });

  if (!meeting) {
    return [];
  }

  const baseMetadata = {
    meetingTitle: meeting.title,
    meetingDate: meeting.meetingDate.toISOString(),
  };

  const inputs: ChunkInput[] = [];

  if (meeting.transcript?.content) {
    inputs.push({
      content: meeting.transcript.content,
      sourceType: 'transcript',
      sourceId: meeting.transcript.id,
      meetingId: meeting.id,
      metadata: baseMetadata,
    });
  }

  if (meeting.aiOutput?.summary) {
    inputs.push({
      content: meeting.aiOutput.summary,
      sourceType: 'summary',
      sourceId: meeting.aiOutput.id,
      meetingId: meeting.id,
      metadata: baseMetadata,
    });
  }

  const decisions = Array.isArray(meeting.aiOutput?.decisions)
    ? (meeting.aiOutput.decisions as MeetingDecision[])
    : [];

  decisions.forEach((decision, index) => {
    const text = decision.text?.trim();
    if (!text) return;
    inputs.push({
      content: [text, decision.context].filter(Boolean).join('\n'),
      sourceType: 'decision',
      sourceId: meeting.aiOutput!.id,
      meetingId: meeting.id,
      metadata: { ...baseMetadata, decisionIndex: index },
    });
  });

  const risks = Array.isArray(meeting.aiOutput?.risks)
    ? (meeting.aiOutput.risks as MeetingRisk[])
    : [];

  risks.forEach((risk, index) => {
    const text = risk.text?.trim();
    if (!text) return;
    inputs.push({
      content: [`Severity: ${risk.severity ?? 'unknown'}`, text, risk.context]
        .filter(Boolean)
        .join('\n'),
      sourceType: 'summary',
      sourceId: meeting.aiOutput!.id,
      meetingId: meeting.id,
      metadata: { ...baseMetadata, riskIndex: index, kind: 'risk', chunkOffset: index + 1 },
    });
  });

  for (const item of meeting.actionItems) {
    const content = [item.title, item.description].filter(Boolean).join('\n');
    if (!content.trim()) continue;

    inputs.push({
      content,
      sourceType: 'action_item',
      sourceId: item.id,
      meetingId: meeting.id,
      metadata: {
        ...baseMetadata,
        status: item.status,
      },
    });
  }

  return inputs;
}
