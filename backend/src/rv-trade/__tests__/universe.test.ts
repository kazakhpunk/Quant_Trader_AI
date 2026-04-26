import { UNIVERSE, bucketsForCountry, allBuckets, pairsWithinBuckets } from '../universe';

describe('universe', () => {
  it('contains 15 countries', () => {
    expect(UNIVERSE).toHaveLength(15);
  });

  it('every country has required fields', () => {
    for (const c of UNIVERSE) {
      expect(c.iso).toMatch(/^[A-Z]{3}$/);
      expect(c.name).toBeTruthy();
      expect(c.region).toMatch(/LatAm|EMEA|Asia|MENA/);
      expect(c.rating).toBeGreaterThanOrEqual(1);
      expect(c.rating).toBeLessThanOrEqual(22);
      expect(typeof c.oilExporter).toBe('boolean');
      expect(c.igHy).toMatch(/IG|HY/);
      expect(c.fredOasSeriesId).toMatch(/^BAML/);
    }
  });

  it('bucketsForCountry returns at least one bucket', () => {
    const brazil = UNIVERSE.find(c => c.iso === 'BRA')!;
    expect(bucketsForCountry(brazil).length).toBeGreaterThan(0);
  });

  it('pairsWithinBuckets returns unordered, deduped pairs', () => {
    const pairs = pairsWithinBuckets(UNIVERSE);
    const seen = new Set<string>();
    for (const p of pairs) {
      const key = [p.a.iso, p.b.iso].sort().join('|');
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      expect(p.a.iso).not.toBe(p.b.iso);
      expect(p.bucket).toBeTruthy();
    }
    expect(pairs.length).toBeGreaterThan(20);
    expect(pairs.length).toBeLessThan(120);
  });
});
