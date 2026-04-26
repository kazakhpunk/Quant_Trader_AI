import { Asset, AssetCategory } from './rv-types';

/** Real, publicly accessible spread / yield series. The original 15 EM-sovereign
 *  FRED series in this file were hallucinated; FRED doesn't publish country-level
 *  EM OAS. This rebuilds the universe from what's actually free + queryable:
 *
 *    1. ICE BofA EM Corporate Plus OAS series on FRED — region / rating /
 *       grade / sector buckets (verified live against the FRED API)
 *    2. EM bond ETFs on Yahoo Finance — basket-level price series for the
 *       handful of cases where a tradeable proxy exists
 */
export const UNIVERSE: Asset[] = [
  // ---- FRED: overall benchmark ----
  { iso: 'fred-em',         name: 'EM Corp Plus (overall)', category: 'overall', source: 'fred', region: 'Global', seriesId: 'BAMLEMCBPIOAS' },

  // ---- FRED: regional cuts ----
  { iso: 'fred-asia',       name: 'EM Asia',                category: 'region',  source: 'fred', region: 'Asia',   seriesId: 'BAMLEMRACRPIASIAOAS' },
  { iso: 'fred-latam',      name: 'EM Latin America',       category: 'region',  source: 'fred', region: 'LatAm',  seriesId: 'BAMLEMRLCRPILAOAS' },
  { iso: 'fred-emea',       name: 'EM EMEA',                category: 'region',  source: 'fred', region: 'EMEA',   seriesId: 'BAMLEMRECRPIEMEAOAS' },
  { iso: 'fred-em-eur',     name: 'EM Euro-denominated',    category: 'region',  source: 'fred', region: 'Global', seriesId: 'BAMLEMEBCRPIEOAS' },

  // ---- FRED: rating buckets ----
  { iso: 'fred-aaa-a',      name: 'AAA-A EM Corp',          category: 'rating',  source: 'fred', igHy: 'IG', seriesId: 'BAMLEM1BRRAAA2ACRPIOAS' },
  { iso: 'fred-bbb',        name: 'BBB EM Corp',            category: 'rating',  source: 'fred', igHy: 'IG', seriesId: 'BAMLEM2BRRBBBCRPIOAS' },
  { iso: 'fred-bb',         name: 'BB EM Corp',             category: 'rating',  source: 'fred', igHy: 'HY', seriesId: 'BAMLEM3BRRBBCRPIOAS' },
  { iso: 'fred-b-lower',    name: 'B & Lower EM Corp',      category: 'rating',  source: 'fred', igHy: 'HY', seriesId: 'BAMLEM4BRRBLCRPIOAS' },
  { iso: 'fred-crossover',  name: 'Crossover (BBB/BB) EM',  category: 'rating',  source: 'fred', seriesId: 'BAMLEM5BCOCRPIOAS' },

  // ---- FRED: grade aggregates ----
  { iso: 'fred-hg',         name: 'High Grade EM',          category: 'grade',   source: 'fred', igHy: 'IG', seriesId: 'BAMLEMIBHGCRPIOAS' },
  { iso: 'fred-hy',         name: 'High Yield EM',          category: 'grade',   source: 'fred', igHy: 'HY', seriesId: 'BAMLEMHBHYCRPIOAS' },

  // ---- FRED: sector cuts ----
  { iso: 'fred-public',     name: 'Public Sector EM',       category: 'sector',  source: 'fred', seriesId: 'BAMLEMPBPUBSICRPIOAS' },
  { iso: 'fred-private',    name: 'Private Sector EM',      category: 'sector',  source: 'fred', seriesId: 'BAMLEMPTPRVICRPIOAS' },
  { iso: 'fred-financial',  name: 'Financial EM',           category: 'sector',  source: 'fred', seriesId: 'BAMLEMFSFCRPIOAS' },
  { iso: 'fred-non-fin',    name: 'Non-Financial EM',       category: 'sector',  source: 'fred', seriesId: 'BAMLEMNSNFCRPIOAS' },

  // ---- Yahoo: tradeable EM bond ETFs (basket prices) ----
  { iso: 'yh-emb',  name: 'EMB · iShares JPM USD EM Bond',         category: 'etf', source: 'yahoo', seriesId: 'EMB' },
  { iso: 'yh-emhy', name: 'EMHY · iShares EM High Yield Bond',     category: 'etf', source: 'yahoo', seriesId: 'EMHY' },
  { iso: 'yh-emlc', name: 'EMLC · VanEck JPM EM Local Currency',   category: 'etf', source: 'yahoo', seriesId: 'EMLC' },
  { iso: 'yh-vwob', name: 'VWOB · Vanguard EM Government Bond',    category: 'etf', source: 'yahoo', seriesId: 'VWOB' },
  { iso: 'yh-lemb', name: 'LEMB · iShares Latin America Bonds',    category: 'etf', source: 'yahoo', seriesId: 'LEMB' },
  { iso: 'yh-bil',  name: 'BIL · 1-3M T-Bill (cash anchor)',       category: 'etf', source: 'yahoo', seriesId: 'BIL' },
];

export const ASSET_CATEGORIES: AssetCategory[] = [
  'overall', 'region', 'rating', 'grade', 'sector', 'etf',
];

/** Pair candidates: every unique unordered same-category pair. With ~20 assets
 *  spread across 6 categories, this yields ~30-50 candidates — small enough
 *  for the cointegration funnel to evaluate end-to-end on every signals refresh. */
export function pairsWithinCategories(
  universe: Asset[]
): { a: Asset; b: Asset; category: AssetCategory }[] {
  const out: { a: Asset; b: Asset; category: AssetCategory }[] = [];
  const sorted = [...universe].sort((x, y) => x.iso.localeCompare(y.iso));
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i], b = sorted[j];
      if (a.category !== b.category) continue;
      out.push({ a, b, category: a.category });
    }
  }
  return out;
}

// ---------- back-compat shim ----------
// The original code (and one stored test) talked in "buckets" + a
// `pairsWithinBuckets` helper. Anything still importing those names gets the
// new category-based behavior; pre-existing call sites keep working.
export const allBuckets = ASSET_CATEGORIES;
export function bucketsForCountry(c: Asset): AssetCategory[] {
  return [c.category];
}
export const pairsWithinBuckets = pairsWithinCategories;
