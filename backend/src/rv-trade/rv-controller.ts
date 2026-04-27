import { Request, Response } from 'express';
import { UNIVERSE } from './universe';
import { FredClient } from './fred-client';
import { YahooSeriesClient } from './yahoo-client';
import { runPairPipeline, DEFAULT_PIPELINE_CONFIG } from './pair-pipeline';
import { buildSignal } from './signal-service';
import { runBacktest } from './backtest-engine';
import { RvStore } from './rv-store';
import { BacktestConfig, TradingRules } from './rv-types';
import { memoize, invalidate } from '../lib/response-cache';

const FRED_CACHE_MS = 6 * 60 * 60 * 1000;        // 6h
const HISTORY_DAYS = 5 * 365;                    // 5y default lookback
const RESPONSE_CACHE_MS = 5 * 60 * 1000;         // 5min — cheap re-renders, fresh enough

export class RvController {
  private yahoo: YahooSeriesClient;

  constructor(private store: RvStore, private fred: FredClient) {
    this.yahoo = new YahooSeriesClient({
      cacheGet: (k) => store.getCachedFred(k, FRED_CACHE_MS),
      cacheSet: (k, obs) => store.setCachedFred(k, obs),
    });
  }

  getUniverse = async (_req: Request, res: Response) => {
    // Return the static list immediately — the page should render in <50ms.
    // Per-asset stats live on /universe/stats so the slow series-fetch
    // doesn't block navigation.
    res.json({ universe: UNIVERSE });
  };

  getUniverseStats = async (_req: Request, res: Response) => {
    const result = await memoize('rv:universe-stats', RESPONSE_CACHE_MS, async () => {
      let series: Map<string, { dates: string[]; values: number[] }>;
      try { series = await this.fetchSeries(); } catch { series = new Map(); }
      const stats: Record<string, ReturnType<typeof computeSeriesStats>> = {};
      for (const a of UNIVERSE) {
        const s = series.get(a.iso);
        stats[a.iso] = s && s.values.length >= 30 ? computeSeriesStats(s.values) : null;
      }
      return { stats };
    });
    res.json(result);
  };

  private async fetchSeries(): Promise<Map<string, { dates: string[]; values: number[] }>> {
    const end = new Date().toISOString().slice(0, 10);
    const startDate = new Date(); startDate.setDate(startDate.getDate() - HISTORY_DAYS);
    const start = startDate.toISOString().slice(0, 10);
    const out = new Map<string, { dates: string[]; values: number[] }>();
    for (const c of UNIVERSE) {
      try {
        const obs = c.source === 'yahoo'
          ? await this.yahoo.getSeries(c.seriesId, start, end)
          : await this.fred.getSeries(c.seriesId, start, end);
        if (!obs.length) continue;
        out.set(c.iso, { dates: obs.map(o => o.date), values: obs.map(o => o.value) });
      } catch (e: any) {
        console.warn(
          `[rv] series fetch failed for ${c.iso} (${c.source}:${c.seriesId}):`,
          e?.response?.status, e?.response?.data?.error_message || e?.message
        );
      }
    }
    return out;
  }

  getPairs = async (_req: Request, res: Response) => {
    const result = await memoize('rv:pairs', RESPONSE_CACHE_MS, async () => {
      const series = await this.fetchSeries();
      const flat = new Map<string, number[]>();
      for (const [iso, s] of series) flat.set(iso, s.values);
      const pairs = runPairPipeline(UNIVERSE.filter(c => flat.has(c.iso)), flat);
      return { pairs, config: DEFAULT_PIPELINE_CONFIG };
    });
    res.json(result);
  };

  getSignals = async (req: Request, res: Response) => {
    const userEmail = (req as any).userEmail || 'anonymous';
    // POST /signals/refresh routes through this same handler; bust the cache
    // so the user gets fresh values instead of the memoized snapshot.
    if (req.method === 'POST') invalidate('rv:signals');
    const result = await memoize('rv:signals', RESPONSE_CACHE_MS, async () => {
      const series = await this.fetchSeries();
      const flat = new Map<string, number[]>();
      for (const [iso, s] of series) flat.set(iso, s.values);
      const pairs = runPairPipeline(UNIVERSE.filter(c => flat.has(c.iso)), flat).filter(p => p.status === 'active');
      const asOf = new Date().toISOString().slice(0, 10);
      const signals = pairs
        .map(p => buildSignal(p, flat.get(p.a.iso)!, flat.get(p.b.iso)!, asOf))
        .filter((s): s is NonNullable<typeof s> => s !== null);
      return { asOf, signals };
    });
    await this.store.saveSnapshot(userEmail, result.asOf, result.signals);
    res.json(result);
  };

  /** Background pre-warm — kick off the slow handlers once at boot so the
   *  first user-facing request is fast. Failures here are intentionally
   *  swallowed; if FRED is down or no key is set, the cache simply stays
   *  empty and per-request handlers will retry. */
  warm() {
    setImmediate(() => {
      memoize('rv:universe-stats', RESPONSE_CACHE_MS, async () => {
        let series: Map<string, { dates: string[]; values: number[] }>;
        try { series = await this.fetchSeries(); } catch { series = new Map(); }
        const stats: Record<string, ReturnType<typeof computeSeriesStats>> = {};
        for (const a of UNIVERSE) {
          const s = series.get(a.iso);
          stats[a.iso] = s && s.values.length >= 30 ? computeSeriesStats(s.values) : null;
        }
        return { stats };
      })
        .then(() => memoize('rv:pairs', RESPONSE_CACHE_MS, async () => {
          const series = await this.fetchSeries();
          const flat = new Map<string, number[]>();
          for (const [iso, s] of series) flat.set(iso, s.values);
          const pairs = runPairPipeline(UNIVERSE.filter(c => flat.has(c.iso)), flat);
          return { pairs, config: DEFAULT_PIPELINE_CONFIG };
        }))
        .then(() => console.log('[rv] warm-up complete'))
        .catch((e) => console.warn('[rv] warm-up skipped:', e?.message ?? e));
    });
  }

  postBacktest = async (req: Request, res: Response) => {
    const userEmail = (req as any).userEmail || 'anonymous';
    const config = parseBacktestConfig(req.body);
    if ('error' in config) { res.status(400).json(config); return; }
    const series = await this.fetchSeries();
    const run = runBacktest({ universe: UNIVERSE.filter(c => series.has(c.iso)), seriesByIso: series, config });
    run.userEmail = userEmail;
    const id = await this.store.saveRun(run);
    res.json({ runId: id, run });
  };

  listBacktests = async (req: Request, res: Response) => {
    const userEmail = (req as any).userEmail || 'anonymous';
    const runs = await this.store.listRuns(userEmail);
    res.json({ runs });
  };

  getBacktest = async (req: Request, res: Response) => {
    const run = await this.store.getRun(req.params.id);
    if (!run) { res.status(404).json({ error: 'not found' }); return; }
    res.json({ run });
  };

  deleteBacktest = async (req: Request, res: Response) => {
    const ok = await this.store.deleteRun(req.params.id);
    if (!ok) { res.status(404).json({ error: 'not found' }); return; }
    res.json({ ok: true });
  };
}

function parseBacktestConfig(body: any): BacktestConfig | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'body required' };
  const r = body.rules || {};
  // Defaults tuned per pairs-trading literature (Avellaneda-Lee, Krauss):
  //   entry 2.0  — standard sigma-2 dislocation trigger
  //   exit 0.0   — close on cross through fair value (centerline exit)
  //   stop 4.0   — generous: ~2σ above entry to avoid noise stop-outs
  //   min 3 d    — ignore immediate post-entry noise; let the trade breathe
  //   max 60 d   — ≈ 2× the half-life cap (40 d) — typical holding budget
  //   8 bps      — realistic round-trip for liquid ETF pairs
  const rules: TradingRules = {
    entryZ: numOr(r.entryZ, 2.0),
    exitZ: numOr(r.exitZ, 0.0),
    stopZ: numOr(r.stopZ, 4.0),
    minHoldingDays: Math.max(0, Math.floor(numOr(r.minHoldingDays, 3))),
    maxHoldingDays: Math.max(5, Math.floor(numOr(r.maxHoldingDays, 60))),
    costBpsRoundTrip: Math.max(0, numOr(r.costBpsRoundTrip, 8)),
    sizing: r.sizing === 'inverseVol' ? 'inverseVol' : 'equalWeight',
  };
  return {
    rules,
    startDate: typeof body.startDate === 'string' ? body.startDate : '2022-01-01',
    endDate: typeof body.endDate === 'string' ? body.endDate : new Date().toISOString().slice(0, 10),
    notional: numOr(body.notional, 1_000_000),
    dv01YearsProxy: numOr(body.dv01YearsProxy, 7),
  };
}

function numOr(v: any, d: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

/** Per-series summary statistics used to position assets in the universe map.
 *  Robust to short series (returns null on insufficient data). */
export interface SeriesStats {
  mean: number;          // mean level
  vol: number;           // sample stdev of daily diffs
  ret30d: number;        // % change over last ~30 obs
  autocorr1: number;     // lag-1 autocorrelation of diffs
  last: number;          // most recent value
  n: number;             // number of observations used
}

export function computeSeriesStats(values: number[]): SeriesStats | null {
  const n = values.length;
  if (n < 30) return null;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const last = values[n - 1];
  const back = values[Math.max(0, n - 30)];
  const ret30d = back !== 0 ? ((last - back) / back) * 100 : 0;
  const diffs: number[] = [];
  for (let i = 1; i < n; i++) diffs.push(values[i] - values[i - 1]);
  const dMean = diffs.reduce((s, v) => s + v, 0) / diffs.length;
  const variance = diffs.reduce((s, v) => s + (v - dMean) ** 2, 0) / Math.max(diffs.length - 1, 1);
  const vol = Math.sqrt(variance);
  let autocorr1 = 0;
  if (diffs.length > 2 && vol > 0) {
    let num = 0;
    for (let i = 1; i < diffs.length; i++) {
      num += (diffs[i] - dMean) * (diffs[i - 1] - dMean);
    }
    autocorr1 = num / ((diffs.length - 1) * variance);
  }
  return { mean, vol, ret30d, autocorr1, last, n };
}
