import { Db } from "mongodb";
import {
  DIMENSIONS,
  Dimension,
  DimensionScores,
  RatingRow,
  VISIBLE_DIMENSIONS,
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

// Sentiment from the `sentiment` npm package: per-article integer scores
// averaged into a single number (typical range ~ -10..+10).
// Map 0 → 50, +10 → 100, -10 → 0.
export function normalizeSentimentRaw(s: number): number {
  return clamp01(50 + s * 5);
}

const NEUTRAL = 50;

export class RatingsService {
  constructor(private db: Db) {}

  async getAll(): Promise<RatingRow[]> {
    // Collections in use:
    //   technicalData    (ticker, rsi14, sma20, sma50, ema20, ema50)
    //   fundamentalData  (ticker, peRatio, pegRatio, profitMargin, dividendYield, payoutRatio, revenue, freeCashFlow)
    //   longCandidates / shortCandidates  (ticker, sentiment, ...)
    // priceAnalysis / volatilityAnalysis don't exist — those dimensions stay at NEUTRAL
    // and are hidden in the UI via VISIBLE_DIMENSIONS.
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

      if (typeof doc.rsi14 === "number") {
        byTicker[t].scores.technical = normalizeRsi(doc.rsi14);
      }
      byTicker[t].metrics.technical = {
        rsi: doc.rsi14,
        sma20: doc.sma20,
        sma50: doc.sma50,
        ema20: doc.ema20,
        ema50: doc.ema50,
      };
    }

    // ----- fundamental -----
    const fundDocs = await this.db
      .collection("fundamentalData")
      .find({})
      .toArray();
    for (const doc of fundDocs) {
      const t = doc.ticker as string;
      if (!t || !byTicker[t]) continue;
      if (typeof doc.peRatio === "number") {
        byTicker[t].scores.fundamental = normalizePe(doc.peRatio);
      }
      byTicker[t].metrics.fundamental = {
        pe: doc.peRatio,
        pegRatio: doc.pegRatio,
        profitMargin: doc.profitMargin,
        dividendYield: doc.dividendYield,
        payoutRatio: doc.payoutRatio,
      };
    }

    // ----- sentiment -----
    // Sentiment scores live on the long/short candidate documents (one per ticker).
    const longCands = await this.db.collection("longCandidates").find({}).toArray();
    const shortCands = await this.db.collection("shortCandidates").find({}).toArray();
    for (const doc of [...longCands, ...shortCands]) {
      const t = doc.ticker as string;
      if (!t || !byTicker[t]) continue;
      if (typeof doc.sentiment === "number") {
        byTicker[t].scores.sentiment = normalizeSentimentRaw(doc.sentiment);
        byTicker[t].metrics.sentiment = { score: doc.sentiment };
      }
    }

    // ----- price + volatility -----
    // No source data; left at NEUTRAL and hidden in the UI.

    const out = Object.values(byTicker).map((row) => ({
      ...row,
      // Composite averages only the dimensions we actually compute, so
      // missing pipelines don't drag every score toward 50.
      composite: Math.round(
        VISIBLE_DIMENSIONS.reduce((s, d) => s + clamp01(row.scores[d]), 0) /
          VISIBLE_DIMENSIONS.length
      ),
    }));
    return out.sort((a, b) => b.composite - a.composite);
  }
}
