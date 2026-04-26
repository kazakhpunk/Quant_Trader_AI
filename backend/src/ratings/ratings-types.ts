export const DIMENSIONS = [
  "technical",
  "fundamental",
  "sentiment",
  "price",
  "volatility",
] as const;
export type Dimension = (typeof DIMENSIONS)[number];

// Dimensions surfaced in the UI tables. All five render columns + sections so
// you can sort and inspect the underlying metrics.
export const VISIBLE_DIMENSIONS = DIMENSIONS;
export type VisibleDimension = (typeof VISIBLE_DIMENSIONS)[number];

// Dimensions that contribute to the composite score. Per industry convention
// (Zacks / Morningstar / Stockopedia / FactSet practitioner models), price
// returns are typically subsumed by "technical" and volatility is treated as a
// risk overlay used for position sizing — not as a stock-picking score.
// Keeping price + volatility visible as descriptive metrics but excluded from
// the composite average.
export const COMPOSITE_DIMENSIONS = ["technical", "fundamental", "sentiment"] as const;
export type CompositeDimension = (typeof COMPOSITE_DIMENSIONS)[number];

export type DimensionScores = Record<Dimension, number>; // each 0..100

// Trade direction for which the score is computed. "long" rewards undervalued /
// oversold / positive sentiment; "short" rewards overvalued / overbought /
// negative sentiment. Same raw metrics, opposite-sign normalizers.
export const DIRECTIONS = ["long", "short"] as const;
export type Direction = (typeof DIRECTIONS)[number];

export interface RatingRow {
  ticker: string;
  // `composite` and `scores` mirror the long-direction variants for backward
  // compatibility. New callers should read scoresLong / scoresShort directly.
  composite: number; // 0..100 — same as compositeLong
  scores: DimensionScores; // same as scoresLong
  compositeLong: number;
  compositeShort: number;
  scoresLong: DimensionScores;
  scoresShort: DimensionScores;
  metrics: Partial<{
    technical: { rsi?: number; sma20?: number; sma50?: number; ema20?: number; ema50?: number };
    fundamental: { pe?: number; pegRatio?: number; profitMargin?: number; dividendYield?: number; payoutRatio?: number };
    sentiment: { score?: number; newsCount?: number };
    price: { d1Pct?: number; d5Pct?: number; d30Pct?: number };
    volatility: { sigma30d?: number; atr?: number };
  }>;
  asOf: string; // ISO
}
