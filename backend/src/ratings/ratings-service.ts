import { Db } from "mongodb";
import {
  DIMENSIONS,
  Dimension,
  DimensionScores,
  RatingRow,
} from "./ratings-types";

const clamp01 = (n: number): number => Math.max(0, Math.min(100, n));

export function computeComposite(scores: DimensionScores): number {
  const sum = DIMENSIONS.reduce((acc, d) => acc + clamp01(scores[d]), 0);
  return Math.round(sum / DIMENSIONS.length);
}

// RSI: 50 is ideal, 0 or 100 are extreme. Triangle around 50.
export function normalizeRsi(rsi: number): number {
  return clamp01(100 - Math.abs(rsi - 50) * 2);
}

// P/E: 15 ≈ ideal. <0 → 0, 15 → 100, decays for high P/E.
export function normalizePe(pe: number): number {
  if (pe <= 0) return 0;
  return clamp01(100 - Math.abs(pe - 15) * 2);
}

// Sentiment compound score in [-1, 1].
export function normalizeSentimentRaw(s: number): number {
  return clamp01(((s + 1) / 2) * 100);
}

const NEUTRAL = 50;

export class RatingsService {
  constructor(private db: Db) {}

  async getAll(): Promise<RatingRow[]> {
    // NOTE: Discovery via Step 1 confirmed the actual collection names differ from the plan defaults.
    // Actual collections found: "technicalData" (fields: ticker, rsi14, sma50, sma20, ema50, ema20)
    //                           "fundamentalData" (fields: ticker, peRatio, profitMargin, pegRatio, ...)
    // Collections NOT present: sentimentAnalysis, priceAnalysis, volatilityAnalysis —
    //   those dimensions default to NEUTRAL (50).
    const tickerDocs = await this.db
      .collection("technicalData")
      .find({})
      .toArray();

    const byTicker: Record<string, RatingRow> = {};

    for (const doc of tickerDocs) {
      const t = doc.ticker as string;
      if (!t) continue;
      byTicker[t] = {
        ticker: t,
        composite: 0,
        scores: {
          technical: NEUTRAL,
          fundamental: NEUTRAL,
          sentiment: NEUTRAL,
          price: NEUTRAL,
          volatility: NEUTRAL,
        },
        metrics: {},
        asOf: new Date().toISOString(),
      };

      // technicalData stores rsi14 (not rsi), and sma50/sma20 (not ma50/ma200)
      if (typeof doc.rsi14 === "number") {
        byTicker[t].scores.technical = normalizeRsi(doc.rsi14);
        byTicker[t].metrics.technical = {
          rsi: doc.rsi14,
          ma50: doc.sma50,
        };
      }
    }

    // ----- fundamental -----
    // fundamentalData stores peRatio (not pe), profitMargin
    const fundDocs = await this.db
      .collection("fundamentalData")
      .find({})
      .toArray();
    for (const doc of fundDocs) {
      const t = doc.ticker as string;
      if (!t || !byTicker[t]) continue;
      if (typeof doc.peRatio === "number") {
        byTicker[t].scores.fundamental = normalizePe(doc.peRatio);
        byTicker[t].metrics.fundamental = {
          pe: doc.peRatio,
          profitMargin: doc.profitMargin,
        };
      }
    }

    // ----- sentiment -----
    // Collection "sentimentAnalysis" not present in DB — dimension stays at NEUTRAL.

    // ----- price -----
    // Collection "priceAnalysis" not present in DB — dimension stays at NEUTRAL.

    // ----- volatility -----
    // Collection "volatilityAnalysis" not present in DB — dimension stays at NEUTRAL.

    const out = Object.values(byTicker).map((row) => ({
      ...row,
      composite: computeComposite(row.scores),
    }));
    return out.sort((a, b) => b.composite - a.composite);
  }
}
