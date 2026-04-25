import { getApiUrl } from "@/lib/utils";

export const DIMENSIONS = ["technical", "fundamental", "sentiment", "price", "volatility"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export interface RatingRow {
  ticker: string;
  composite: number;
  scores: Record<Dimension, number>;
  metrics: Partial<{
    technical: { rsi?: number; macd?: number; ma50?: number; ma200?: number };
    fundamental: { pe?: number; epsGrowth?: number; profitMargin?: number };
    sentiment: { newsCount?: number; avgScore?: number };
    price: { d1Pct?: number; d5Pct?: number; d30Pct?: number };
    volatility: { sigma30d?: number; atr?: number; beta?: number };
  }>;
  asOf: string;
}

export async function getRatings(): Promise<RatingRow[]> {
  const res = await fetch(`${getApiUrl()}/api/v1/ratings`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
