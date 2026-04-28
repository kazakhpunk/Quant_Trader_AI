import { Db } from "mongodb";
import {
  DIMENSIONS,
  Dimension,
  DimensionScores,
  RatingRow,
  VISIBLE_DIMENSIONS,
  COMPOSITE_DIMENSIONS,
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

// SMA20 vs SMA50 trend strength. Uses the *relative* gap so the score is
// scale-invariant (a $100 stock with a $5 gap and a $20 stock with a $1 gap
// are both 5% spreads → same score). Saturates at ±10%.
//   gap = 0%   → 50 (neutral, signals crossing)
//   gap = +5%  → 75 (uptrend)
//   gap = +10% → 100 (strong uptrend)
//   gap = -5%  → 25
//   gap = -10% → 0
export function normalizeTrendLong(sma20: number, sma50: number): number {
  if (!Number.isFinite(sma20) || !Number.isFinite(sma50) || sma50 <= 0) return 50;
  const gapPct = ((sma20 - sma50) / sma50) * 100;
  return clamp01(50 + gapPct * 5);
}

export function normalizePeLong(pe: number): number {
  if (!Number.isFinite(pe)) return 50;
  if (pe <= 0) return 0;          // losses kill a long thesis
  if (pe < 15) return 100;        // anything cheaper than fair = best long
  return clamp01(100 - (pe - 15) * 2);
}

// PEG = P/E adjusted for growth. PEG ≈ 1 is fair-priced for the growth rate;
// < 1 is cheap relative to growth (best long); > 2 is expensive.
//   peg = 0.5 → 100 (saturated cheap)
//   peg = 1   → 75
//   peg = 1.5 → 50 (neutral)
//   peg = 2.5 → 0  (saturated expensive)
//   peg ≤ 0   → 50 (negative-growth or data error → neutral, do not penalize)
export function normalizePegLong(peg: number): number {
  if (!Number.isFinite(peg) || peg <= 0) return 50;
  return clamp01(125 - peg * 50);
}

// Profit margin: positive margin = quality / pricing power, which tilts a
// name *toward* a long thesis. 25%+ margin saturates at 100; -25% at 0.
// Decimal input expected (0.10 = 10%).
export function normalizeMarginLong(m: number): number {
  if (!Number.isFinite(m)) return 50;
  return clamp01(50 + m * 200);
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

// Mirror of normalizeTrendLong: a downward-crossed SMA20 (below SMA50) is
// bullish *for shorts*. Uses the same ±10% saturation band.
export function normalizeTrendShort(sma20: number, sma50: number): number {
  if (!Number.isFinite(sma20) || !Number.isFinite(sma50) || sma50 <= 0) return 50;
  const gapPct = ((sma20 - sma50) / sma50) * 100;
  return clamp01(50 - gapPct * 5);
}

export function normalizePeShort(pe: number): number {
  if (!Number.isFinite(pe)) return 50;
  if (pe <= 0) return 100;        // losses = strong short thesis
  if (pe < 15) return 0;          // cheap = bad short
  return clamp01((pe - 15) * 2);
}

// Mirror of normalizePegLong: high PEG = expensive growth = good short.
export function normalizePegShort(peg: number): number {
  if (!Number.isFinite(peg) || peg <= 0) return 50;
  return clamp01(peg * 50 - 25);
}

// Mirror of normalizeMarginLong: low / negative margin = weak business = good short.
export function normalizeMarginShort(m: number): number {
  if (!Number.isFinite(m)) return 50;
  return clamp01(50 - m * 200);
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
    COMPOSITE_DIMENSIONS.reduce((s, d) => s + clamp01(scores[d]), 0) /
      COMPOSITE_DIMENSIONS.length
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

    // Per-ticker per-component score buckets. Each entry is the {long, short}
    // score for that component, or null if the upstream data for that
    // component is missing. We collect first, then compute cross-ticker
    // column means below to mean-impute missing components — that way a
    // partially-observed ticker doesn't get penalized (or skipped) for
    // the missing field, it inherits the universe average of that field.
    type LRPair = { long: number; short: number };
    type TechParts = {
      rsi: LRPair | null;
      smaTrend: LRPair | null;
      emaTrend: LRPair | null;
    };
    type FundParts = {
      pe: LRPair | null;
      peg: LRPair | null;
      margin: LRPair | null;
    };
    const techParts: Record<string, TechParts> = {};
    const fundParts: Record<string, FundParts> = {};

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

      // ----- technical: collect per-component scores; final blend below -----
      // Components: RSI-14 (momentum), SMA20/50 trend (slow), EMA20/50 trend
      // (fast). The trend normalizer is moving-average-agnostic so SMA and
      // EMA share the same math with different inputs.
      techParts[t] = {
        rsi:
          typeof doc.rsi14 === "number"
            ? {
                long: normalizeRsiLong(doc.rsi14),
                short: normalizeRsiShort(doc.rsi14),
              }
            : null,
        smaTrend:
          typeof doc.sma20 === "number" && typeof doc.sma50 === "number"
            ? {
                long: normalizeTrendLong(doc.sma20, doc.sma50),
                short: normalizeTrendShort(doc.sma20, doc.sma50),
              }
            : null,
        emaTrend:
          typeof doc.ema20 === "number" && typeof doc.ema50 === "number"
            ? {
                long: normalizeTrendLong(doc.ema20, doc.ema50),
                short: normalizeTrendShort(doc.ema20, doc.ema50),
              }
            : null,
      };
      if (typeof doc.rsi14 === "number") {
        row.scores.technical = normalizeRsi(doc.rsi14); // legacy field: undirected RSI
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
      // ----- fundamental: collect per-component scores; final blend below -----
      // Components: P/E (current-earnings valuation), PEG (growth-adjusted),
      // profit margin (quality). Dividend yield and payout are kept as
      // descriptive metrics only — directional logic for them at this
      // universe size would just be curve-fitting.
      fundParts[t] = {
        pe:
          typeof doc.peRatio === "number"
            ? {
                long: normalizePeLong(doc.peRatio),
                short: normalizePeShort(doc.peRatio),
              }
            : null,
        peg:
          typeof doc.pegRatio === "number"
            ? {
                long: normalizePegLong(doc.pegRatio),
                short: normalizePegShort(doc.pegRatio),
              }
            : null,
        margin:
          typeof doc.profitMargin === "number"
            ? {
                long: normalizeMarginLong(doc.profitMargin),
                short: normalizeMarginShort(doc.profitMargin),
              }
            : null,
      };
      if (typeof doc.peRatio === "number") {
        row.scores.fundamental = normalizePe(doc.peRatio); // legacy field
      }
      row.metrics.fundamental = {
        pe: doc.peRatio,
        pegRatio: doc.pegRatio,
        profitMargin: doc.profitMargin,
        dividendYield: doc.dividendYield,
        payoutRatio: doc.payoutRatio,
      };
    }

    // ----- column means for mean-imputation -----
    // Cross-ticker average of each component's score, restricted to
    // tickers that actually have data for it. If no ticker in the universe
    // has a given component, the mean falls back to neutral 50.
    const colMean = <T extends Record<string, LRPair | null>>(
      bag: Record<string, T>,
      key: keyof T,
    ): LRPair => {
      let lSum = 0, sSum = 0, n = 0;
      for (const parts of Object.values(bag)) {
        const v = parts[key] as LRPair | null;
        if (!v) continue;
        lSum += v.long;
        sSum += v.short;
        n++;
      }
      return n > 0 ? { long: lSum / n, short: sSum / n } : { long: 50, short: 50 };
    };

    const techMeans = {
      rsi: colMean(techParts, "rsi"),
      smaTrend: colMean(techParts, "smaTrend"),
      emaTrend: colMean(techParts, "emaTrend"),
    };
    const fundMeans = {
      pe: colMean(fundParts, "pe"),
      peg: colMean(fundParts, "peg"),
      margin: colMean(fundParts, "margin"),
    };

    // ----- final dimension blend with mean-imputation -----
    // For each ticker: if at least one component is observed for that
    // dimension, fill the missing ones with the cross-ticker column mean
    // and average all three. If *every* component is missing the dimension
    // stays at NEUTRAL 50 (set by emptyScores at row construction time) —
    // we don't fabricate a score from column means alone.
    for (const t of Object.keys(byTicker)) {
      const row = byTicker[t];

      const tp = techParts[t];
      if (tp && (tp.rsi || tp.smaTrend || tp.emaTrend)) {
        const rsi      = tp.rsi      ?? techMeans.rsi;
        const smaTrend = tp.smaTrend ?? techMeans.smaTrend;
        const emaTrend = tp.emaTrend ?? techMeans.emaTrend;
        row.scoresLong.technical  =
          (rsi.long  + smaTrend.long  + emaTrend.long)  / 3;
        row.scoresShort.technical =
          (rsi.short + smaTrend.short + emaTrend.short) / 3;
      }

      const fp = fundParts[t];
      if (fp && (fp.pe || fp.peg || fp.margin)) {
        const pe     = fp.pe     ?? fundMeans.pe;
        const peg    = fp.peg    ?? fundMeans.peg;
        const margin = fp.margin ?? fundMeans.margin;
        row.scoresLong.fundamental  =
          (pe.long  + peg.long  + margin.long)  / 3;
        row.scoresShort.fundamental =
          (pe.short + peg.short + margin.short) / 3;
      }
    }

    // ----- sentiment: polarity attenuated by article count -----
    // A single headline is noise; 20+ headlines is signal. The raw polarity
    // is mixed with neutral 50 in proportion to (1 − confidence), where
    // confidence = min(1, newsCount / 20). Practically:
    //   newsCount = 0   → confidence 0    → score = 50  (neutral, no info)
    //   newsCount = 5   → confidence 0.25 → 25% sentiment + 75% neutral
    //   newsCount = 20+ → confidence 1    → full sentiment polarity
    // This is the "give every metric a contribution" version: the score
    // *and* the article count both shape the dimension's contribution to
    // the composite.
    const blendSentiment = (
      raw: number,
      newsCount: number,
      direction: "long" | "short",
    ): number => {
      const conf = Math.max(0, Math.min(1, (newsCount || 0) / 20));
      const polarized =
        direction === "long"
          ? normalizeSentimentLong(raw)
          : normalizeSentimentShort(raw);
      return conf * polarized + (1 - conf) * 50;
    };

    const sentimentDocs = await this.db.collection("sentimentData").find({}).toArray();
    for (const doc of sentimentDocs) {
      const t = doc.ticker as string;
      if (!t || !byTicker[t]) continue;
      if (typeof doc.sentiment !== "number") continue;
      const row = byTicker[t];
      const news = typeof doc.newsCount === "number" ? doc.newsCount : 0;
      row.scores.sentiment = normalizeSentimentRaw(doc.sentiment);
      row.scoresLong.sentiment = blendSentiment(doc.sentiment, news, "long");
      row.scoresShort.sentiment = blendSentiment(doc.sentiment, news, "short");
      row.metrics.sentiment = { score: doc.sentiment, newsCount: doc.newsCount };
    }
    const longCands = await this.db.collection("longCandidates").find({}).toArray();
    const shortCands = await this.db.collection("shortCandidates").find({}).toArray();
    for (const doc of [...longCands, ...shortCands]) {
      const t = doc.ticker as string;
      if (!t || !byTicker[t] || byTicker[t].metrics.sentiment) continue;
      if (typeof doc.sentiment !== "number") continue;
      const row = byTicker[t];
      // Fallback path has no newsCount — treat as low-confidence (5 articles).
      row.scores.sentiment = normalizeSentimentRaw(doc.sentiment);
      row.scoresLong.sentiment = blendSentiment(doc.sentiment, 5, "long");
      row.scoresShort.sentiment = blendSentiment(doc.sentiment, 5, "short");
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

  /** Today's UTC date as YYYY-MM-DD. Snapshot collection keys off this so a
   *  single global snapshot is shared across all callers (authed or anon)
   *  and rolls over at UTC midnight — same cadence as the QStash daily
   *  /update job that refreshes the underlying technical/fundamental/
   *  sentiment collections. */
  private todayKey(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /** Read-through snapshot: returns today's cached rows if they exist,
   *  otherwise computes via getAll(), persists the snapshot, and returns it.
   *  Anonymous visitors hit this same path — no Alpaca state is read. */
  async getCached(): Promise<RatingRow[]> {
    const date = this.todayKey();
    const cached = await this.db
      .collection("ratings_snapshots")
      .findOne({ date });
    if (cached?.rows?.length) return cached.rows as RatingRow[];

    const rows = await this.getAll();
    if (rows.length > 0) {
      // upsert so two concurrent first-of-day requests don't both insert
      await this.db.collection("ratings_snapshots").updateOne(
        { date },
        { $setOnInsert: { date, rows, asOf: new Date().toISOString() } },
        { upsert: true },
      );
    }
    return rows;
  }

  /** Force-write today's snapshot, overwriting any existing one. Useful for
   *  the QStash daily /update job to call after refreshing the upstream
   *  data so the next page load doesn't pay the join cost. */
  async refreshSnapshot(): Promise<RatingRow[]> {
    const rows = await this.getAll();
    await this.db.collection("ratings_snapshots").updateOne(
      { date: this.todayKey() },
      { $set: { rows, asOf: new Date().toISOString() } },
      { upsert: true },
    );
    return rows;
  }
}
