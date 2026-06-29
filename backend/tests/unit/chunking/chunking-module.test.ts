import { parseVttCues, stripVttToPlainText } from '../../../src/modules/chunking/lib/vtt-parser';
import { chunkStatsService } from '../../../src/modules/chunking/services/chunk-stats.service';
import { chunkingService } from '../../../src/modules/chunking/services/chunking.service';
import { CHUNK_DEFAULTS } from '../../../src/modules/chunking/lib/chunk.constants';

describe('VTT parser', () => {
  it('extracts speaker and timestamps from VTT cues', () => {
    const vtt = `WEBVTT

00:01:00.000 --> 00:01:05.000
Alice: We agreed to delay the launch.

00:01:06.000 --> 00:01:10.000
Bob: April is the new target.`;

    const cues = parseVttCues(vtt);
    expect(cues).toHaveLength(2);
    expect(cues[0]?.speaker).toBe('Alice');
    expect(cues[0]?.timestampStart).toBe('00:01:00.000');
    expect(stripVttToPlainText(vtt)).toContain('delay the launch');
  });
});

describe('ChunkStatsService', () => {
  it('computes aggregate chunk statistics', () => {
    const stats = chunkStatsService.compute([
      {
        content: 'a',
        chunkIndex: 0,
        tokenCount: 10,
        sourceType: 'decision',
        sourceId: 's1',
        metadata: { chunkingStrategy: 'single' },
      },
      {
        content: 'b',
        chunkIndex: 0,
        tokenCount: 20,
        sourceType: 'transcript',
        sourceId: 's2',
        metadata: { chunkingStrategy: 'recursive' },
      },
    ]);

    expect(stats.totalChunks).toBe(2);
    expect(stats.totalTokens).toBe(30);
    expect(stats.bySourceType.decision).toBe(1);
    expect(stats.strategiesUsed).toContain('recursive');
  });
});

describe('ChunkingService', () => {
  it('strips VTT before chunking transcripts', () => {
    const vtt = `WEBVTT\n\n00:01:00.000 --> 00:01:05.000\nAlice: Hello team.`;
    const chunks = chunkingService.chunk([
      {
        content: vtt,
        sourceType: 'transcript',
        sourceId: '00000000-0000-4000-8000-000000000001',
      },
    ]);

    expect(chunks[0]?.content).not.toContain('-->');
    expect(chunks[0]?.metadata.originalFormat).toBe('vtt');
  });

  it('applies per-source defaults from constants', () => {
    const result = chunkingService.chunkWithStats([
      {
        content: 'Single decision statement.',
        sourceType: 'decision',
        sourceId: '00000000-0000-4000-8000-000000000002',
      },
    ]);

    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0]?.metadata.targetTokens).toBe(CHUNK_DEFAULTS.decision.targetTokens);
  });
});
