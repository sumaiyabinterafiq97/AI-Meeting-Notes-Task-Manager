export interface RankedItem<T> {
  item: T;
  rank: number;
  score: number;
}

export function reciprocalRankFusion<T>(
  rankedLists: Array<Array<T>>,
  getKey: (item: T) => string,
  k = 60,
): RankedItem<T>[] {
  const scores = new Map<string, { item: T; score: number }>();

  for (const list of rankedLists) {
    list.forEach((item, index) => {
      const key = getKey(item);
      const contribution = 1 / (k + index + 1);
      const existing = scores.get(key);
      if (existing) {
        existing.score += contribution;
      } else {
        scores.set(key, { item, score: contribution });
      }
    });
  }

  return Array.from(scores.values())
    .map(({ item, score }, index) => ({ item, score, rank: index + 1 }))
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}
