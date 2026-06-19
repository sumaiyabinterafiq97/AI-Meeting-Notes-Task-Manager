import type { ContextBlock } from '../types/rag.types';

export interface ParsedCitation {
  index: number;
  chunkId?: string;
  meetingId?: string;
  meetingTitle?: string;
  excerpt?: string;
  timestamp?: string;
}

export class CitationParserService {
  extractCitationReferences(content: string): number[] {
    const matches = content.matchAll(/\[CITATION-(\d+)\]/g);
    return [...matches].map((match) => Number(match[1]));
  }

  mapCitations(content: string, blocks: ContextBlock[]): ParsedCitation[] {
    const indices = [...new Set(this.extractCitationReferences(content))];
    const citations: ParsedCitation[] = [];

    for (const index of indices) {
      const block = blocks.find((entry) => entry.citationIndex === index);
      if (!block) continue;

      citations.push({
        index,
        chunkId: block.chunkId,
        meetingId: block.meetingId,
        meetingTitle: block.meetingTitle,
        excerpt: block.content.slice(0, 200),
        timestamp:
          typeof block.metadata.timestamp_start === 'string'
            ? block.metadata.timestamp_start
            : undefined,
      });
    }

    return citations;
  }
}

export const citationParserService = new CitationParserService();
