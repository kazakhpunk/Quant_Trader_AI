import { Request, Response } from 'express';
import { UNIVERSE } from './universe';
import { FredClient } from './fred-client';
import { YahooSeriesClient } from './yahoo-client';
import { runPairPipeline, DEFAULT_PIPELINE_CONFIG } from './pair-pipeline';
import { buildSignal } from './signal-service';
import { runBacktest } from './backtest-engine';
import { RvStore } from './rv-store';
import { BacktestConfig, TradingRules } from './rv-types';

const FRED_CACHE_MS = 6 * 60 * 60 * 1000;        // 6h
const HISTORY_DAYS = 5 * 365;                    // 5y default lookback

export class RvController {
  private yahoo: YahooSeriesClient;

  constructor(private store: RvStore, private fred: FredClient) {
    this.yahoo = new YahooSeriesClient({
      cacheGet: (k) => store.getCachedFred(k, FRED_CACHE_MS),
      cacheSet: (k, obs) => store.setCachedFred(k, obs),
    });
  }

  getUniverse = async (_req: Request, res: Response) => {
    // Try to enrich with per-asset summary stats so the UI can plot a
    // meaningful PCA. Stats use the cached series — if a fetch fails for
    // any asset (no key, network), we still return that asset with stats
    // omitted. Cheap when cache is warm; ~10-30s cold.
    let series: Map<string, { dates: string[]; values: number[] }>;
    try {
      series = await this.fetchSeries();
    } catch {
      series = new Map();
    }
    const enriched = UNIVERSE.map((a) => {
      const s = series.get(a.iso);
      if (!s || s.values.length < 30) return { ...a, stats: null };
      return { ...a, stats: computeSeriesStats(s.values) };
    });
    res.json({ universe: enriched });
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
    const series = await this.fetchSeries();
    const flat = new Map<string, number[]>();
    for (const [iso, s] of series) flat.set(iso, s.values);
    const pairs = runPairPipeline(UNIVERSE.filter(c => flat.has(c.iso)), flat);
    res.json({ pairs, config: DEFAULT_PIPELINE_CONFIG });
  };

  getSignals = async (req: Request, res: Response) => {
    const userEmail = (req as any).userEmail || 'anonymous';
    const series = await this.fetchSeries();
    const flat = new Map<string, number[]>();
    for (const [iso, s] of series) flat.set(iso, s.values);
    const pairs = runPairPipeline(UNIVERSE.filter(c => flat.has(c.iso)), flat).filter(p => p.status === 'active');
    const asOf = new Date().toISOString().slice(0, 10);
    const signals = pairs
      .map(p => buildSignal(p, flat.get(p.a.iso)!, flat.get(p.b.iso)!, asOf))
      .filter((s): s is NonNullable<typeof s> => s !== null);
    await this.store.saveSnapshot(userEmail, asOf, signals);
    res.json({ asOf, signals });
  };

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
}

function parseBacktestConfig(body: any): BacktestConfig | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'body required' };
  const r = body.rules || {};
  const rules: TradingRules = {
    entryZ: numOr(r.entryZ, 2.0),
    exitZ: numOr(r.exitZ, 0.5),
    stopZ: numOr(r.stopZ, 3.5),
    maxHoldingDays: Math.max(5, Math.floor(numOr(r.maxHoldingDays, 60))),
    costBpsRoundTrip: Math.max(0, numOr(r.costBpsRoundTrip, 30)),
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
