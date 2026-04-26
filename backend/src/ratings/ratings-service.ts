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

// ---------- Direction-agnostic normalizers (legacy) ----------

// RSI: 50 is ideal, 0 or 100 are extreme. Triangle around 50.
export function normalizeRsi(rsi: number): number {
  return clamp01(100 - Math.abs(rsi - 50) * 2);
}

// P/E: 15 ≈ ideal. <0 → 0, 15 → 100, decays for high P/E.
export function normalizePe(pe: number): number {
  if (pe <= 0) return 0;
  return clamp01(100 - Math.abs(pe - 15) * 2);
}

// Sentiment: per-article integer scores averaged (~ -10..+10). 0 → 50, +10 → 100, -10 → 0.
export function normalizeSentimentRaw(s: number): number {
  return clamp01(50 + s * 5);
}

// 30-day annualized volatility (%): lower = more stable.
export function normalizeSigma30d(sigma: number): number {
  if (!Number.isFinite(sigma) || sigma < 0) return 50;
  return clamp01(100 - sigma * 1.25);
}

// 30-day price return (%): higher = better. 0% → 50, +20% → 100, -20% → 0.
export function normalizePctReturn(pct: number): number {
  if (!Number.isFinite(pct)) return 50;
  return clamp01(50 + pct * 2.5);
}

// ---------- Long-side normalizers ----------
// Reward conditions favorable to a buy: oversold, undervalued, positive sentiment,
// recent uptrend, low volatility.

export function normalizeRsiLong(rsi: number): number {
  if (!Number.isFinite(rsi)) return 50;
  return clamp01(100 - rsi); // RSI 30 → 70 (good long), RSI 70 → 30
}

export function normalizePeLong(pe: number): number {
  if (!Number.isFinite(pe)) return 50;
  if (pe <= 0) return 0;          // losses kill a long thesis
  if (pe < 15) return 100;        // anything cheaper than fair = best long
  return clamp01(100 - (pe - 15) * 2);
}

export function normalizeSentimentLong(s: number): number {
  if (!Number.isFinite(s)) return 50;
  return clamp01(50 + s * 5);
}

export function normalizePriceLong(pct: number): number {
  if (!Number.isFinite(pct)) return 50;
  return clamp01(50 + pct * 2.5); // momentum interpretation
}

export function normalizeVolLong(sigma: number): number {
  if (!Number.isFinite(sigma) || sigma < 0) return 50;
  return clamp01(100 - sigma * 1.25);
}

// ---------- Short-side normalizers ----------
// Reward overbought, overvalued, negative sentiment, recent downtrend. Volatility
// is penalized harder than for longs because shorts carry asymmetric squeeze risk.

export function normalizeRsiShort(rsi: number): number {
  if (!Number.isFinite(rsi)) return 50;
  return clamp01(rsi); // RSI 70 → 70 (good short), RSI 30 → 30
}

export function normalizePeShort(pe: number): number {
  if (!Number.isFinite(pe)) return 50;
  if (pe <= 0) return 100;        // losses = strong short thesis
  if (pe < 15) return 0;          // cheap = bad short
  return clamp01((pe - 15) * 2);
}

export function normalizeSentimentShort(s: number): number {
  if (!Number.isFinite(s)) return 50;
  return clamp01(50 - s * 5);
}

export function normalizePriceShort(pct: number): number {
  if (!Number.isFinite(pct)) return 50;
  return clamp01(50 - pct * 2.5);
}

export function normalizeVolShort(sigma: number): number {
  if (!Number.isFinite(sigma) || sigma < 0) return 50;
  return clamp01(100 - sigma * 1.5); // shorts more sensitive to high vol (squeeze)
}

const NEUTRAL = 50;

const emptyScores = (): DimensionScores => ({
  technical: NEUTRAL,
  fundamental: NEUTRAL,
  sentiment: NEUTRAL,
  price: NEUTRAL,
  volatility: NEUTRAL,
});

const compositeOf = (scores: DimensionScores): number =>
  Math.round(
    VISIBLE_DIMENSIONS.reduce((s, d) => s + clamp01(scores[d]), 0) /
      VISIBLE_DIMENSIONS.length
  );

export class RatingsService {
  constructor(private db: Db) {}

  async getAll(): Promise<RatingRow[]> {
    // Collections in use:
    //   technicalData    (ticker, rsi14, sma20/50, ema20/50, close, pct1d/5d/30d, sigma30d, atr14)
    //   fundamentalData  (ticker, peRatio, pegRatio, profitMargin, dividendYield, payoutRatio, ...)
    //   sentimentData    (ticker, sentiment, newsCount) — populated by persistAllSentiment
    //   longCandidates / shortCandidates — fallback for sentiment when sentimentData is empty
    const tickerDocs = await this.db
      .collection("technicalData")
      .find({})
      .toArray();

    const byTicker: Record<string, RatingRow> = {};

    for (const doc of tickerDocs) {
      const t = doc.ticker as string;
      if (!t) continue;

      const row: RatingRow = {
        ticker: t,
        composite: 0,
        scores: emptyScores(),
        compositeLong: 0,
        compositeShort: 0,
        scoresLong: emptyScores(),
        scoresShort: emptyScores(),
        metrics: {},
        asOf: new Date().toISOString(),
      };

      // ----- technical (RSI-14 driven) -----
      if (typeof doc.rsi14 === "number") {
        row.scores.technical = normalizeRsi(doc.rsi14);
        row.scoresLong.technical = normalizeRsiLong(doc.rsi14);
        row.scoresShort.technical = normalizeRsiShort(doc.rsi14);
      }
      row.metrics.technical = {
        rsi: doc.rsi14,
        sma20: doc.sma20,
        sma50: doc.sma50,
        ema20: doc.ema20,
        ema50: doc.ema50,
      };

      // ----- price (30d % driven) -----
      if (typeof doc.pct30d === "number") {
        row.scores.price = normalizePctReturn(doc.pct30d);
        row.scoresLong.price = normalizePriceLong(doc.pct30d);
        row.scoresShort.price = normalizePriceShort(doc.pct30d);
      }
      row.metrics.price = {
        d1Pct: doc.pct1d,
        d5Pct: doc.pct5d,
        d30Pct: doc.pct30d,
      };

      // ----- volatility (30d σ driven) -----
      if (typeof doc.sigma30d === "number") {
        row.scores.volatility = normalizeSigma30d(doc.sigma30d);
        row.scoresLong.volatility = normalizeVolLong(doc.sigma30d);
        row.scoresShort.volatility = normalizeVolShort(doc.sigma30d);
      }
      row.metrics.volatility = {
        sigma30d: doc.sigma30d,
        atr: doc.atr14,
      };

      byTicker[t] = row;
    }

    // ----- fundamental (P/E driven) -----
    const fundDocs = await this.db
      .collection("fundamentalData")
      .find({})
      .toArray();
    for (const doc of fundDocs) {
      const t = doc.ticker as string;
      if (!t || !byTicker[t]) continue;
      const row = byTicker[t];
      if (typeof doc.peRatio === "number") {
        row.scores.fundamental = normalizePe(doc.peRatio);
        row.scoresLong.fundamental = normalizePeLong(doc.peRatio);
        row.scoresShort.fundamental = normalizePeShort(doc.peRatio);
      }
      row.metrics.fundamental = {
        pe: doc.peRatio,
        pegRatio: doc.pegRatio,
        profitMargin: doc.profitMargin,
        dividendYield: doc.dividendYield,
        payoutRatio: doc.payoutRatio,
      };
    }

    // ----- sentiment -----
    const sentimentDocs = await this.db.collection("sentimentData").find({}).toArray();
    for (const doc of sentimentDocs) {
      const t = doc.ticker as string;
      if (!t || !byTicker[t]) continue;
      if (typeof doc.sentiment !== "number") continue;
      const row = byTicker[t];
      row.scores.sentiment = normalizeSentimentRaw(doc.sentiment);
      row.scoresLong.sentiment = normalizeSentimentLong(doc.sentiment);
      row.scoresShort.sentiment = normalizeSentimentShort(doc.sentiment);
      row.metrics.sentiment = { score: doc.sentiment, newsCount: doc.newsCount };
    }
    const longCands = await this.db.collection("longCandidates").find({}).toArray();
    const shortCands = await this.db.collection("shortCandidates").find({}).toArray();
    for (const doc of [...longCands, ...shortCands]) {
      const t = doc.ticker as string;
      if (!t || !byTicker[t] || byTicker[t].metrics.sentiment) continue;
      if (typeof doc.sentiment !== "number") continue;
      const row = byTicker[t];
      row.scores.sentiment = normalizeSentimentRaw(doc.sentiment);
      row.scoresLong.sentiment = normalizeSentimentLong(doc.sentiment);
      row.scoresShort.sentiment = normalizeSentimentShort(doc.sentiment);
      row.metrics.sentiment = { score: doc.sentiment };
    }

    const out = Object.values(byTicker).map((row) => {
      row.compositeLong = compositeOf(row.scoresLong);
      row.compositeShort = compositeOf(row.scoresShort);
      // Mirror long into the legacy fields so existing callers keep working.
      row.composite = row.compositeLong;
      row.scores = row.scoresLong;
      return row;
    });
    return out.sort((a, b) => b.compositeLong - a.compositeLong);
  }
}
