export const DIMENSIONS = [
  "technical",
  "fundamental",
  "sentiment",
  "price",
  "volatility",
] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export type DimensionScores = Record<Dimension, number>; // each 0..100

export interface RatingRow {
  ticker: string;
  composite: number; // 0..100
  scores: DimensionScores;
  metrics: Partial<{
    technical: { rsi?: number; macd?: number; ma50?: number; ma200?: number };
    fundamental: { pe?: number; epsGrowth?: number; profitMargin?: number };
    sentiment: { newsCount?: number; avgScore?: number };
    price: { d1Pct?: number; d5Pct?: number; d30Pct?: number };
    volatility: { sigma30d?: number; atr?: number; beta?: number };
  }>;
  asOf: string; // ISO
}
