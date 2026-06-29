import { EMBEDDING_DIMENSIONS } from '../lib/embedding.constants';

export class EmbeddingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmbeddingValidationError';
  }
}

export interface ValidatedEmbeddingBatch {
  texts: string[];
  originalIndices: number[];
}

/**
 * Validates embedding inputs and vector outputs before storage.
 */
export class EmbeddingValidatorService {
  filterEmptyTexts(texts: string[]): ValidatedEmbeddingBatch {
    const filtered: string[] = [];
    const originalIndices: number[] = [];

    texts.forEach((text, index) => {
      if (text.trim().length > 0) {
        filtered.push(text);
        originalIndices.push(index);
      }
    });

    return { texts: filtered, originalIndices };
  }

  assertVectorDimensions(
    vectors: number[][],
    expectedDimensions = EMBEDDING_DIMENSIONS,
  ): void {
    for (let i = 0; i < vectors.length; i++) {
      const vector = vectors[i];
      if (!vector || vector.length === 0) {
        throw new EmbeddingValidationError(`Empty embedding vector at index ${i}`);
      }
      if (vector.length !== expectedDimensions) {
        throw new EmbeddingValidationError(
          `Invalid embedding dimensions at index ${i}: expected ${expectedDimensions}, got ${vector.length}`,
        );
      }
    }
  }

  remapEmbeddings(
    batchSize: number,
    originalIndices: number[],
    batchEmbeddings: number[][],
  ): number[][] {
    const result: number[][] = new Array(batchSize).fill([]);
    originalIndices.forEach((originalIndex, batchIndex) => {
      result[originalIndex] = batchEmbeddings[batchIndex] ?? [];
    });
    return result;
  }
}

export const embeddingValidatorService = new EmbeddingValidatorService();
