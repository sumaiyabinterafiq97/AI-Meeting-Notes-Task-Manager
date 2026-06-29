import { DocumentSourceType as PrismaDocumentSourceType } from '@prisma/client';
import type { DocumentSourceType } from '../types/vector.types';

const TO_PRISMA: Record<DocumentSourceType, PrismaDocumentSourceType> = {
  transcript: PrismaDocumentSourceType.TRANSCRIPT,
  summary: PrismaDocumentSourceType.SUMMARY,
  decision: PrismaDocumentSourceType.DECISION,
  risk: PrismaDocumentSourceType.RISK,
  action_item: PrismaDocumentSourceType.ACTION_ITEM,
  knowledge: PrismaDocumentSourceType.KNOWLEDGE,
};

const FROM_PRISMA: Record<PrismaDocumentSourceType, DocumentSourceType> = {
  [PrismaDocumentSourceType.TRANSCRIPT]: 'transcript',
  [PrismaDocumentSourceType.SUMMARY]: 'summary',
  [PrismaDocumentSourceType.DECISION]: 'decision',
  [PrismaDocumentSourceType.RISK]: 'risk',
  [PrismaDocumentSourceType.ACTION_ITEM]: 'action_item',
  [PrismaDocumentSourceType.KNOWLEDGE]: 'knowledge',
};

export function normalizeChunkSourceType(sourceType: string): DocumentSourceType {
  if (sourceType === 'task') return 'action_item';
  return sourceType as DocumentSourceType;
}

export function toPrismaSourceType(sourceType: DocumentSourceType | string): PrismaDocumentSourceType {
  return TO_PRISMA[normalizeChunkSourceType(sourceType)];
}

export function fromPrismaSourceType(sourceType: PrismaDocumentSourceType): DocumentSourceType {
  return FROM_PRISMA[sourceType];
}

export function toPgVectorLiteral(values: number[]): string {
  return `[${values.map((value) => Number(value.toFixed(8))).join(',')}]`;
}
