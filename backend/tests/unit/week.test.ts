import { startOfUtcWeek, toIsoWeek } from '../../src/lib/week';

describe('week utilities', () => {
  it('computes ISO week label', () => {
    expect(toIsoWeek(new Date('2026-06-15T12:00:00.000Z'))).toBe('2026-W25');
  });

  it('returns Monday as start of UTC week', () => {
    const start = startOfUtcWeek(new Date('2026-06-15T12:00:00.000Z'));
    expect(start.toISOString()).toBe('2026-06-15T00:00:00.000Z');
  });
});
