import { getApiUrl } from "@/lib/utils";

export const DIMENSIONS = ["technical", "fundamental", "sentiment", "price", "volatility"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const VISIBLE_DIMENSIONS = DIMENSIONS;
export type VisibleDimension = (typeof VISIBLE_DIMENSIONS)[number];

// Dimensions that contribute to the composite score. Price + volatility are
// shown as informational metrics but excluded from the composite — per industry
// convention, price returns belong inside "technical" and volatility is a risk
// overlay used for sizing rather than a stock-picking signal.
export const COMPOSITE_DIMENSIONS = ["technical", "fundamental", "sentiment"] as const;
export type CompositeDimension = (typeof COMPOSITE_DIMENSIONS)[number];

export const DIRECTIONS = ["long", "short"] as const;
export type Direction = (typeof DIRECTIONS)[number];

export interface RatingRow {
  ticker: string;
  // Legacy fields — mirror the long-side variants for back-compat.
  composite: number;
  scores: Record<Dimension, number>;
  compositeLong: number;
  compositeShort: number;
  scoresLong: Record<Dimension, number>;
  scoresShort: Record<Dimension, number>;
  metrics: Partial<{
    technical: { rsi?: number; sma20?: number; sma50?: number; ema20?: number; ema50?: number };
    fundamental: { pe?: number; pegRatio?: number; profitMargin?: number; dividendYield?: number; payoutRatio?: number };
    sentiment: { score?: number; newsCount?: number };
    price: { d1Pct?: number; d5Pct?: number; d30Pct?: number };
    volatility: { sigma30d?: number; atr?: number };
  }>;
  asOf: string;
}

export async function getRatings(): Promise<RatingRow[]> {
  const res = await fetch(`${getApiUrl()}/api/v1/ratings`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
