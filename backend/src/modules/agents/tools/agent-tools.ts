import { prisma } from '../../../config/database';
import { ragService } from '../../rag';
import { searchRepository } from '../../search/search.repository';
import type { AgentTool, AgentToolContext } from './types/tool.types';

const DEFAULT_LIMIT = 10;

export interface SearchMeetingsInput {
  query: string;
  limit?: number;
}

export const searchMeetingsTool: AgentTool<SearchMeetingsInput> = {
  name: 'SearchMeetingsTool',
  description: 'Search workspace meetings by title or tags',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      limit: { type: 'integer', minimum: 1, maximum: 20 },
    },
    required: ['query'],
  },
  async execute(input, context) {
    const limit = input.limit ?? DEFAULT_LIMIT;
    const result = await searchRepository.searchMeetings(context.workspaceId, input.query, {
      page: 1,
      limit,
      skip: 0,
    });
    return result.items;
  },
};

export interface SearchTasksInput {
  query: string;
  limit?: number;
}

export const searchTasksTool: AgentTool<SearchTasksInput> = {
  name: 'SearchTasksTool',
  description: 'Search workspace tasks by title, description, assignee, or status',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      limit: { type: 'integer', minimum: 1, maximum: 20 },
    },
    required: ['query'],
  },
  async execute(input, context) {
    const limit = input.limit ?? DEFAULT_LIMIT;
    const result = await searchRepository.searchTasks(context.workspaceId, input.query, {
      page: 1,
      limit,
      skip: 0,
    });
    return result.items;
  },
};

export interface SearchDecisionsInput {
  query: string;
  limit?: number;
}

export const searchDecisionsTool: AgentTool<SearchDecisionsInput> = {
  name: 'SearchDecisionsTool',
  description: 'Search decisions extracted from meeting AI outputs',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      limit: { type: 'integer', minimum: 1, maximum: 20 },
    },
    required: ['query'],
  },
  async execute(input, context) {
    const limit = input.limit ?? DEFAULT_LIMIT;
    const q = input.query.toLowerCase();

    const outputs = await prisma.meetingAiOutput.findMany({
      where: {
        meeting: {
          workspaceId: context.workspaceId,
          deletedAt: null,
          ...(context.meetingId ? { id: context.meetingId } : {}),
        },
      },
      include: {
        meeting: { select: { id: true, title: true, meetingDate: true } },
      },
      take: 50,
      orderBy: { updatedAt: 'desc' },
    });

    const matches: Array<{
      meetingId: string;
      meetingTitle: string;
      text: string;
      context: string;
    }> = [];

    for (const output of outputs) {
      const decisions = Array.isArray(output.decisions)
        ? (output.decisions as Array<{ text: string; context: string }>)
        : [];

      for (const decision of decisions) {
        if (
          decision.text.toLowerCase().includes(q) ||
          decision.context.toLowerCase().includes(q)
        ) {
          matches.push({
            meetingId: output.meeting.id,
            meetingTitle: output.meeting.title,
            text: decision.text,
            context: decision.context,
          });
        }
      }
      if (matches.length >= limit) break;
    }

    return matches.slice(0, limit);
  },
};

export interface SearchRisksInput {
  query: string;
  limit?: number;
}

export const searchRisksTool: AgentTool<SearchRisksInput> = {
  name: 'SearchRisksTool',
  description: 'Search risks extracted from meeting AI outputs',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      limit: { type: 'integer', minimum: 1, maximum: 20 },
    },
    required: ['query'],
  },
  async execute(input, context) {
    const limit = input.limit ?? DEFAULT_LIMIT;
    const q = input.query.toLowerCase();

    const outputs = await prisma.meetingAiOutput.findMany({
      where: {
        meeting: {
          workspaceId: context.workspaceId,
          deletedAt: null,
          ...(context.meetingId ? { id: context.meetingId } : {}),
        },
      },
      include: {
        meeting: { select: { id: true, title: true } },
      },
      take: 50,
      orderBy: { updatedAt: 'desc' },
    });

    const matches: Array<{
      meetingId: string;
      meetingTitle: string;
      text: string;
      severity: string;
      context: string;
    }> = [];

    for (const output of outputs) {
      const risks = Array.isArray(output.risks)
        ? (output.risks as Array<{ text: string; severity: string; context: string }>)
        : [];

      for (const risk of risks) {
        if (
          risk.text.toLowerCase().includes(q) ||
          risk.context.toLowerCase().includes(q)
        ) {
          matches.push({
            meetingId: output.meeting.id,
            meetingTitle: output.meeting.title,
            text: risk.text,
            severity: risk.severity,
            context: risk.context,
          });
        }
      }
      if (matches.length >= limit) break;
    }

    return matches.slice(0, limit);
  },
};

export interface SearchKnowledgeInput {
  query: string;
  limit?: number;
}

export const searchKnowledgeTool: AgentTool<SearchKnowledgeInput> = {
  name: 'SearchKnowledgeTool',
  description: 'Semantic search over workspace knowledge base and meeting chunks',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      limit: { type: 'integer', minimum: 1, maximum: 20 },
    },
    required: ['query'],
  },
  async execute(input, context) {
    const limit = input.limit ?? DEFAULT_LIMIT;
    const result = await ragService.search({
      query: input.query,
      workspaceId: context.workspaceId,
      meetingId: context.meetingId,
      mode: 'hybrid',
      topK: limit,
    });

    return result.chunks.map((chunk) => ({
      chunkId: chunk.id,
      content: chunk.content.slice(0, 500),
      meetingId: chunk.meetingId,
      sourceType: chunk.sourceType,
      similarity: chunk.similarity,
    }));
  },
};

export const ALL_AGENT_TOOLS = [
  searchMeetingsTool,
  searchTasksTool,
  searchDecisionsTool,
  searchRisksTool,
  searchKnowledgeTool,
] as const;
