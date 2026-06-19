import { reciprocalRankFusion } from '../../../src/modules/vector/services/rrf.service';

describe('reciprocalRankFusion', () => {
  it('fuses rankings from multiple lists', () => {
    const fused = reciprocalRankFusion(
      [
        [
          { id: 'a', score: 0.9 },
          { id: 'b', score: 0.8 },
        ],
        [
          { id: 'b', score: 0.95 },
          { id: 'c', score: 0.7 },
        ],
      ],
      (item) => item.id,
      60,
    );

    expect(fused[0]?.item.id).toBe('b');
    expect(fused.map((entry) => entry.item.id)).toEqual(expect.arrayContaining(['a', 'b', 'c']));
  });
});
