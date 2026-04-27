import * as ss from 'simple-statistics';
import { Country, BacktestConfig, BacktestRun, TradeLogEntry, BacktestMetrics, PairCandidate } from './rv-types';
import { runPairPipeline, DEFAULT_PIPELINE_CONFIG } from './pair-pipeline';
import { kalmanHedgeRatio } from './kalman';
import { cusumPage } from './stats';

export interface BacktestInput {
  universe: Country[];
  seriesByIso: Map<string, { dates: string[]; values: number[] }>;
  config: BacktestConfig;
}

interface OpenPosition {
  pairKey: string;
  a: string; b: string;
  longIso: string;             // higher-spread leg at entry
  shortIso: string;            // lower-spread leg at entry
  entryDate: string;
  entryZ: number;
  beta: number;                // hedge ratio used for sizing
  notional: number;            // dollar notional of long leg
  entryDayIdx: number;
  lastOasLong: number;
  lastOasShort: number;
}

const TRADING_DAYS_PER_YEAR = 252;

export function runBacktest(input: BacktestInput): BacktestRun {
  const { universe, seriesByIso, config } = input;
  const { rules, notional, dv01YearsProxy } = config;

  // Align all series on the date axis of the longest country present.
  const isos = universe.map(c => c.iso).filter(iso => seriesByIso.has(iso));
  if (isos.length < 2) {
    return emptyRun(config);
  }
  const ref = seriesByIso.get(isos[0])!;
  const ds = ref.dates;
  const idxByIso = new Map<string, number[]>();
  for (const iso of isos) {
    const s = seriesByIso.get(iso)!;
    const dateToValIdx = new Map(s.dates.map((d, i) => [d, i]));
    idxByIso.set(iso, ds.map(d => dateToValIdx.get(d) ?? -1));
  }
  const valueAt = (iso: string, dayIdx: number): number | null => {
    const pos = idxByIso.get(iso)![dayIdx];
    if (pos < 0) return null;
    return seriesByIso.get(iso)!.values[pos];
  };

  // Filter to startDate-endDate
  const startIdx = Math.max(0, ds.findIndex(d => d >= config.startDate));
  const endIdx = ds.length - 1 - [...ds].reverse().findIndex(d => d <= config.endDate);
  if (startIdx < 0 || endIdx < startIdx) return emptyRun(config);

  // Need warmup of `lookback` days BEFORE startIdx for initial pipeline run.
  const lookback = DEFAULT_PIPELINE_CONFIG.lookback;
  const warmupStart = Math.max(0, startIdx - lookback);

  let nav = notional;
  const equityCurve: { date: string; nav: number }[] = [];
  const trades: TradeLogEntry[] = [];
  const open = new Map<string, OpenPosition>();

  // Recompute pipeline weekly to keep cost tractable
  const PIPELINE_REFRESH_DAYS = 5;
  let activePairs: PairCandidate[] = [];
  let lastPipelineDay = -PIPELINE_REFRESH_DAYS;

  for (let t = startIdx; t <= endIdx; t++) {
    if (t - lastPipelineDay >= PIPELINE_REFRESH_DAYS) {
      const series = new Map<string, number[]>();
      for (const iso of isos) {
        const slice: number[] = [];
        for (let k = warmupStart; k < t; k++) {
          const v = valueAt(iso, k);
          if (v !== null) slice.push(v);
        }
        if (slice.length >= 60) series.set(iso, slice);
      }
      activePairs = runPairPipeline(universe.filter(c => series.has(c.iso)), series).filter(p => p.status === 'active');
      lastPipelineDay = t;
    }

    // Compute today's z for each active pair using Kalman over slice up to t
    const todaySignals = new Map<string, { z: number; longIso: string; shortIso: string; beta: number; oasLong: number; oasShort: number }>();
    for (const p of activePairs) {
      const ySlice: number[] = [], xSlice: number[] = [];
      for (let k = warmupStart; k <= t; k++) {
        const yv = valueAt(p.a.iso, k); const xv = valueAt(p.b.iso, k);
        if (yv !== null && xv !== null) { ySlice.push(yv); xSlice.push(xv); }
      }
      if (ySlice.length < 60) continue;
      const k = kalmanHedgeRatio(ySlice, xSlice);
      const window = k.resid.slice(-250);
      const mu = ss.mean(window), sigma = Math.max(ss.standardDeviation(window), 1e-9);
      const z = (k.resid[k.resid.length - 1] - mu) / sigma;
      // Same CUSUM regime check the live signal-service uses; skip pairs
      // whose cointegration relationship has likely broken structurally.
      const cu = cusumPage(k.resid.slice(-100), { k: 0.5, h: 5 });
      if (cu.broken) continue;
      const oasA = ySlice[ySlice.length - 1], oasB = xSlice[xSlice.length - 1];
      // Position based on residual sign for mean-reversion:
      //   z > 0  → residual y - β·x is too high → expect y to fall vs β·x
      //            → LONG y (profit if y tightens), SHORT x (profit if x widens)
      //   z ≤ 0  → opposite
      // Earlier code keyed direction off "which leg has higher OAS today",
      // which gives a fixed long-the-higher-leg bias and produces the wrong
      // direction on every z<0 entry.
      const aIsLong = z >= 0;
      const longIso  = aIsLong ? p.a.iso : p.b.iso;
      const shortIso = aIsLong ? p.b.iso : p.a.iso;
      const oasLong  = aIsLong ? oasA : oasB;
      const oasShort = aIsLong ? oasB : oasA;
      todaySignals.set(`${p.a.iso}-${p.b.iso}`, {
        z, longIso, shortIso, beta: k.beta[k.beta.length - 1], oasLong, oasShort,
      });
    }

    // Mark to market existing positions
    for (const [pk, pos] of open) {
      const today = todaySignals.get(pk);
      if (!today) continue;
      const { oasLong, oasShort, beta } = today;
      // P&L: positive when long tightens (ΔOAS_long < 0) and short widens (ΔOAS_short > 0)
      const dOasLong = oasLong - pos.lastOasLong;
      const dOasShort = oasShort - pos.lastOasShort;
      const dv01 = dv01YearsProxy * 0.0001;            // bp → dollar
      const pnl = pos.notional * dv01 * (-dOasLong + beta * dOasShort);
      nav += pnl;
      pos.lastOasLong = oasLong;
      pos.lastOasShort = oasShort;
    }

    // Close logic
    for (const [pk, pos] of [...open]) {
      const today = todaySignals.get(pk);
      const z = today?.z ?? 0;
      const heldDays = t - pos.entryDayIdx;
      let reason: 'meanRevert' | 'stop' | 'timeout' | null = null;
      // Min-holding gate: ignore mean-revert and stop in the first N days
      // so a trade isn't killed by same-day noise right after entry.
      // Timeout still applies once the holding budget is up.
      const canExitOnSignal = heldDays >= rules.minHoldingDays;
      if (canExitOnSignal && Math.abs(z) <= rules.exitZ) reason = 'meanRevert';
      else if (canExitOnSignal && Math.abs(z) >= rules.stopZ) reason = 'stop';
      else if (heldDays >= rules.maxHoldingDays) reason = 'timeout';
      if (reason) {
        const cost = pos.notional * (rules.costBpsRoundTrip / 2 / 10_000);
        nav -= cost;
        trades.push({
          pairKey: pk, entryDate: pos.entryDate, exitDate: ds[t],
          entryZ: pos.entryZ, exitZ: z,
          pnl: nav - notional - sumPriorPnl(trades),
          holdingDays: heldDays, exitReason: reason,
        });
        open.delete(pk);
      }
    }

    // Open logic — equal-weight or inverse-vol over eligible set
    const eligible: { pk: string; weight: number }[] = [];
    for (const [pk, sig] of todaySignals) {
      if (Math.abs(sig.z) < rules.entryZ) continue;
      if (open.has(pk)) continue;
      let weight = 1;
      if (rules.sizing === 'inverseVol') {
        const ap = activePairs.find(p => `${p.a.iso}-${p.b.iso}` === pk);
        if (!ap) continue;
        const ySlice: number[] = [], xSlice: number[] = [];
        for (let k2 = warmupStart; k2 <= t; k2++) {
          const yv = valueAt(ap.a.iso, k2); const xv = valueAt(ap.b.iso, k2);
          if (yv !== null && xv !== null) { ySlice.push(yv); xSlice.push(xv); }
        }
        const k = kalmanHedgeRatio(ySlice, xSlice);
        const sigmaResid = Math.max(ss.standardDeviation(k.resid.slice(-60)), 1e-9);
        weight = 1 / sigmaResid;
      }
      eligible.push({ pk, weight });
    }
    if (eligible.length > 0) {
      const totalWeight = eligible.reduce((s, e) => s + e.weight, 0);
      const bookPortion = notional * 0.10;                          // deploy 10% of book per slot
      for (const e of eligible) {
        const sig = todaySignals.get(e.pk)!;
        const perPair = bookPortion * (e.weight / totalWeight) * eligible.length;
        const cost = perPair * (rules.costBpsRoundTrip / 2 / 10_000);
        nav -= cost;
        open.set(e.pk, {
          pairKey: e.pk, a: e.pk.split('-')[0], b: e.pk.split('-')[1],
          longIso: sig.longIso, shortIso: sig.shortIso,
          entryDate: ds[t], entryZ: sig.z, beta: sig.beta,
          notional: perPair, entryDayIdx: t,
          lastOasLong: sig.oasLong, lastOasShort: sig.oasShort,
        });
      }
    }

    equityCurve.push({ date: ds[t], nav });
  }

  return {
    userEmail: '',
    ts: new Date().toISOString(),
    config,
    metrics: computeMetrics(equityCurve, trades, notional),
    equityCurve,
    trades,
  };
}

function sumPriorPnl(trades: TradeLogEntry[]): number {
  return trades.reduce((s, t) => s + t.pnl, 0);
}

function emptyRun(config: BacktestConfig): BacktestRun {
  return {
    userEmail: '', ts: new Date().toISOString(), config,
    metrics: { totalReturn: 0, annReturn: 0, annVol: 0, sharpe: 0, sortino: 0,
               maxDrawdown: 0, hitRate: 0, avgHoldingDays: 0, turnover: 0,
               deflatedSharpe: 0, numTrades: 0 },
    equityCurve: [{ date: config.startDate, nav: config.notional }],
    trades: [],
  };
}

function computeMetrics(eq: { date: string; nav: number }[], trades: TradeLogEntry[], notional: number): BacktestMetrics {
  if (eq.length < 2) return emptyMetrics();
  const rets: number[] = [];
  for (let i = 1; i < eq.length; i++) rets.push((eq[i].nav - eq[i - 1].nav) / Math.max(eq[i - 1].nav, 1));
  const totalReturn = (eq[eq.length - 1].nav - notional) / notional;
  const annReturn = totalReturn * (TRADING_DAYS_PER_YEAR / eq.length);
  const annVol = rets.length > 1 ? ss.standardDeviation(rets) * Math.sqrt(TRADING_DAYS_PER_YEAR) : 0;
  const sharpe = annVol > 1e-9 ? annReturn / annVol : 0;
  const downside = rets.filter(r => r < 0);
  const downVol = downside.length > 1 ? ss.standardDeviation(downside) * Math.sqrt(TRADING_DAYS_PER_YEAR) : annVol;
  const sortino = downVol > 1e-9 ? annReturn / downVol : 0;
  const maxDrawdown = computeMaxDrawdown(eq.map(e => e.nav));
  const wins = trades.filter(t => t.pnl > 0).length;
  const hitRate = trades.length > 0 ? wins / trades.length : 0;
  const avgHoldingDays = trades.length > 0 ? trades.reduce((s, t) => s + t.holdingDays, 0) / trades.length : 0;
  const turnover = trades.length;
  const deflatedSharpe = computeDeflatedSharpe(sharpe, rets.length, trades.length);
  return { totalReturn, annReturn, annVol, sharpe, sortino, maxDrawdown, hitRate, avgHoldingDays, turnover, deflatedSharpe, numTrades: trades.length };
}

function emptyMetrics(): BacktestMetrics {
  return { totalReturn: 0, annReturn: 0, annVol: 0, sharpe: 0, sortino: 0, maxDrawdown: 0, hitRate: 0, avgHoldingDays: 0, turnover: 0, deflatedSharpe: 0, numTrades: 0 };
}

function computeMaxDrawdown(nav: number[]): number {
  let peak = nav[0], maxDd = 0;
  for (const v of nav) {
    if (v > peak) peak = v;
    const dd = (v - peak) / peak;
    if (dd < maxDd) maxDd = dd;
  }
  return maxDd;
}

function computeDeflatedSharpe(sharpe: number, n: number, numTrials: number): number {
  if (n < 30 || numTrials < 1) return sharpe;
  const expectedMaxSharpe = Math.sqrt(2 * Math.log(Math.max(numTrials, 2))) / Math.sqrt(n);
  return sharpe - expectedMaxSharpe;
}
