import { getApiUrl } from "@/lib/utils";

export const DIMENSIONS = ["technical", "fundamental", "sentiment", "price", "volatility"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const VISIBLE_DIMENSIONS = DIMENSIONS;
export type VisibleDimension = (typeof VISIBLE_DIMENSIONS)[number];

export interface RatingRow {
  ticker: string;
  composite: number;
  scores: Record<Dimension, number>;
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
