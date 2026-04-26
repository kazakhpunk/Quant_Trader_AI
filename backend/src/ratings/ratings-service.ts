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

// 30-day annualized volatility (%): lower = more stable.
// 20% ≈ market-typical → 75; 40% → 50; >80% → 0.
export function normalizeSigma30d(sigma: number): number {
  if (!Number.isFinite(sigma) || sigma < 0) return 50;
  return clamp01(100 - sigma * 1.25);
}

// 30-day price return (%): higher = better.
// 0% → 50, +20% → 100, -20% → 0.
export function normalizePctReturn(pct: number): number {
  if (!Number.isFinite(pct)) return 50;
  return clamp01(50 + pct * 2.5);
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

      // Price + volatility live on the same technicalData doc once /update
      // has run with the extended pipeline. Older docs without these fields
      // stay at NEUTRAL.
      if (typeof doc.pct30d === "number") {
        byTicker[t].scores.price = normalizePctReturn(doc.pct30d);
      }
      byTicker[t].metrics.price = {
        d1Pct: doc.pct1d,
        d5Pct: doc.pct5d,
        d30Pct: doc.pct30d,
      };
      if (typeof doc.sigma30d === "number") {
        byTicker[t].scores.volatility = normalizeSigma30d(doc.sigma30d);
      }
      byTicker[t].metrics.volatility = {
        sigma30d: doc.sigma30d,
        atr: doc.atr14,
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
    // Primary source: sentimentData (one doc per ticker, from persistAllSentiment).
    // Fallback: long/short candidate docs for older runs that pre-date the broader pass.
    const sentimentDocs = await this.db.collection("sentimentData").find({}).toArray();
    for (const doc of sentimentDocs) {
      const t = doc.ticker as string;
      if (!t || !byTicker[t]) continue;
      if (typeof doc.sentiment === "number") {
        byTicker[t].scores.sentiment = normalizeSentimentRaw(doc.sentiment);
        byTicker[t].metrics.sentiment = {
          score: doc.sentiment,
          newsCount: doc.newsCount,
        };
      }
    }
    const longCands = await this.db.collection("longCandidates").find({}).toArray();
    const shortCands = await this.db.collection("shortCandidates").find({}).toArray();
    for (const doc of [...longCands, ...shortCands]) {
      const t = doc.ticker as string;
      if (!t || !byTicker[t] || byTicker[t].metrics.sentiment) continue;
      if (typeof doc.sentiment === "number") {
        byTicker[t].scores.sentiment = normalizeSentimentRaw(doc.sentiment);
        byTicker[t].metrics.sentiment = { score: doc.sentiment };
      }
    }

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
