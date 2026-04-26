import { Request, Response } from 'express';
import { UNIVERSE } from './universe';
import { FredClient } from './fred-client';
import { runPairPipeline, DEFAULT_PIPELINE_CONFIG } from './pair-pipeline';
import { buildSignal } from './signal-service';
import { runBacktest } from './backtest-engine';
import { RvStore } from './rv-store';
import { BacktestConfig, TradingRules } from './rv-types';

const FRED_CACHE_MS = 6 * 60 * 60 * 1000;        // 6h
const HISTORY_DAYS = 5 * 365;                    // 5y default lookback

export class RvController {
  constructor(private store: RvStore, private fred: FredClient) {}

  getUniverse = async (_req: Request, res: Response) => {
    res.json({ universe: UNIVERSE });
  };

  private async fetchSeries(): Promise<Map<string, { dates: string[]; values: number[] }>> {
    const end = new Date().toISOString().slice(0, 10);
    const startDate = new Date(); startDate.setDate(startDate.getDate() - HISTORY_DAYS);
    const start = startDate.toISOString().slice(0, 10);
    const out = new Map<string, { dates: string[]; values: number[] }>();
    for (const c of UNIVERSE) {
      const key = `${c.fredOasSeriesId}|${start}|${end}`;
      const cached = await this.store.getCachedFred(key, FRED_CACHE_MS);
      let obs = cached;
      if (!obs) {
        try {
          obs = await this.fred.getSeries(c.fredOasSeriesId, start, end);
          await this.store.setCachedFred(key, obs);
        } catch (e) { continue; }
      }
      out.set(c.iso, { dates: obs.map(o => o.date), values: obs.map(o => o.value) });
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
