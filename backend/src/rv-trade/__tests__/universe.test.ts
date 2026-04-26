import { UNIVERSE, ASSET_CATEGORIES, pairsWithinCategories } from '../universe';

describe('universe', () => {
  it('contains a meaningful number of real assets', () => {
    expect(UNIVERSE.length).toBeGreaterThanOrEqual(15);
  });

  it('every asset has the required fields', () => {
    for (const a of UNIVERSE) {
      expect(a.iso).toMatch(/^[a-z]+-[a-z0-9-]+$/);
      expect(a.name).toBeTruthy();
      expect(ASSET_CATEGORIES).toContain(a.category);
      expect(a.source === 'fred' || a.source === 'yahoo').toBe(true);
      expect(a.seriesId).toBeTruthy();
      // FRED EM OAS ids start with BAML; Yahoo tickers are short alphanumeric.
      if (a.source === 'fred') expect(a.seriesId).toMatch(/^BAML/);
      if (a.source === 'yahoo') expect(a.seriesId).toMatch(/^[A-Z]+$/);
    }
  });

  it('asset ids are unique', () => {
    const ids = UNIVERSE.map(a => a.iso);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every category has at least one asset', () => {
    for (const cat of ASSET_CATEGORIES) {
      expect(UNIVERSE.some(a => a.category === cat)).toBe(true);
    }
  });

  it('pairsWithinCategories returns unordered, deduped same-category pairs', () => {
    const pairs = pairsWithinCategories(UNIVERSE);
    const seen = new Set<string>();
    for (const p of pairs) {
      const key = [p.a.iso, p.b.iso].sort().join('|');
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      expect(p.a.iso).not.toBe(p.b.iso);
      expect(p.a.category).toBe(p.b.category);
      expect(p.category).toBe(p.a.category);
    }
    expect(pairs.length).toBeGreaterThan(10);
  });
});
