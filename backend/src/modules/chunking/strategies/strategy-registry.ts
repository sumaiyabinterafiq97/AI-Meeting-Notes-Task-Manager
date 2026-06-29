import type { ChunkInput, ChunkingOptions, TextChunk, ChunkingStrategyName } from '../types/chunk.types';
import type { ChunkingStrategy } from './chunking-strategies';
import { resolveChunkDefaults } from '../lib/chunk.constants';
import {
  fixedSizeChunkingStrategy,
  recursiveChunkingStrategy,
  semanticChunkingStrategy,
  slidingWindowChunkingStrategy,
} from './chunking-strategies';
import {
  singleBlockChunkingStrategy,
  transcriptChunkingStrategy,
} from './transcript.strategy';

export class ChunkingStrategyRegistry {
  private readonly strategies = new Map<string, ChunkingStrategy>();

  constructor() {
    this.register(fixedSizeChunkingStrategy);
    this.register(recursiveChunkingStrategy);
    this.register(slidingWindowChunkingStrategy);
    this.register(semanticChunkingStrategy);
    this.register(transcriptChunkingStrategy);
    this.register(singleBlockChunkingStrategy);
  }

  register(strategy: ChunkingStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  resolve(sourceType: string, override?: ChunkingStrategyName): ChunkingStrategy {
    const defaults = resolveChunkDefaults(sourceType as never);
    const name = override ?? defaults.strategy;
    return this.strategies.get(name) ?? singleBlockChunkingStrategy;
  }

  resolveOptions(sourceType: string, options?: ChunkingOptions): ChunkingOptions {
    const defaults = resolveChunkDefaults(sourceType as never);
    return {
      targetTokens: options?.targetTokens ?? defaults.targetTokens,
      overlapTokens: options?.overlapTokens ?? defaults.overlapTokens,
      strategy: options?.strategy ?? defaults.strategy,
    };
  }

  chunk(input: ChunkInput, options?: ChunkingOptions): TextChunk[] {
    const resolved = this.resolveOptions(input.sourceType, options);
    const strategy = this.resolve(input.sourceType, resolved.strategy);
    const chunks = strategy.chunk(input, resolved);

    return chunks.map((chunk) => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        targetTokens: resolved.targetTokens,
        overlapTokens: resolved.overlapTokens,
      },
    }));
  }
}

export const chunkingStrategyRegistry = new ChunkingStrategyRegistry();
