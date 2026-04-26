import { runBacktest, BacktestInput } from '../backtest-engine';
import { Country, BacktestConfig } from '../rv-types';

function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const A: Country = { iso: 'AAA', name: 'A', region: 'LatAm', rating: 11, oilExporter: false, commodityExporter: true, igHy: 'HY', debtToGdp: 50, fredOasSeriesId: 'A' };
const B: Country = { iso: 'BBB', name: 'B', region: 'LatAm', rating: 11, oilExporter: false, commodityExporter: true, igHy: 'HY', debtToGdp: 50, fredOasSeriesId: 'B' };

function dates(n: number, start = '2024-01-02'): string[] {
  const out: string[] = [];
  const d = new Date(start);
  while (out.length < n) {
    if (d.getDay() !== 0 && d.getDay() !== 6) out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

describe('runBacktest', () => {
  const config: BacktestConfig = {
    rules: { entryZ: 1.5, exitZ: 0.3, stopZ: 4, maxHoldingDays: 30, costBpsRoundTrip: 30, sizing: 'equalWeight' },
    startDate: '2024-01-02', endDate: '2024-12-31', notional: 1_000_000, dv01YearsProxy: 7,
  };

  it('produces deterministic equity curve given fixed inputs', () => {
    const n = 300;
    const ds = dates(n);
    const xRaw: number[] = [], yRaw: number[] = [];
    let xv = 100, yv = 110;
    for (let i = 0; i < n; i++) {
      xv += Math.sin(i / 8) * 0.5;
      yv = 5 + 1.0 * xv + Math.sin(i / 4) * 4;          // cointegrated, oscillating residual (deterministic — no RNG needed)
      xRaw.push(xv); yRaw.push(yv);
    }
    const input: BacktestInput = {
      universe: [A, B],
      seriesByIso: new Map([['AAA', { dates: ds, values: yRaw }], ['BBB', { dates: ds, values: xRaw }]]),
      config,
    };
    const r1 = runBacktest(input);
    const r2 = runBacktest(input);
    expect(r1.equityCurve).toEqual(r2.equityCurve);
    expect(r1.metrics.numTrades).toBe(r2.metrics.numTrades);
    expect(r1.equityCurve.length).toBeGreaterThan(0);
  });

  it('returns zero NAV change when no pair survives pipeline', () => {
    const rand = seededRand(1234);
    const n = 300;
    const ds = dates(n);
    const xRaw = Array.from({ length: n }, () => rand() * 10);
    const yRaw = Array.from({ length: n }, () => rand() * 10);
    const input: BacktestInput = {
      universe: [A, B],
      seriesByIso: new Map([['AAA', { dates: ds, values: yRaw }], ['BBB', { dates: ds, values: xRaw }]]),
      config,
    };
    const out = runBacktest(input);
    const last = out.equityCurve[out.equityCurve.length - 1];
    expect(last.nav).toBeCloseTo(config.notional, -3);   // within $1k of starting notional
  });

  it('costs reduce return monotonically', () => {
    const n = 300;
    const ds = dates(n);
    const xRaw: number[] = [], yRaw: number[] = [];
    let xv = 100;
    for (let i = 0; i < n; i++) {
      xv += Math.sin(i / 8) * 0.5;
      yRaw.push(5 + 1.0 * xv + Math.sin(i / 4) * 4); xRaw.push(xv);
    }
    const seriesByIso = new Map([['AAA', { dates: ds, values: yRaw }], ['BBB', { dates: ds, values: xRaw }]]);
    const noCost = runBacktest({ universe: [A, B], seriesByIso, config: { ...config, rules: { ...config.rules, costBpsRoundTrip: 0 } } });
    const highCost = runBacktest({ universe: [A, B], seriesByIso, config: { ...config, rules: { ...config.rules, costBpsRoundTrip: 100 } } });
    expect(noCost.metrics.totalReturn).toBeGreaterThanOrEqual(highCost.metrics.totalReturn);
  });
});
