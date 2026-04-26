import { PairCandidate, SignalRow } from './rv-types';
import { kalmanHedgeRatio } from './kalman';
import { cusumPage } from './stats';
import * as ss from 'simple-statistics';

const MIN_HISTORY = 60;
const Z_LOOKBACK = 250;
const CUSUM_LOOKBACK = 100;

export function buildSignal(pair: PairCandidate, ySeries: number[], xSeries: number[], asOf: string): SignalRow | null {
  const len = Math.min(ySeries.length, xSeries.length);
  if (len < MIN_HISTORY) return null;
  const y = ySeries.slice(-len), x = xSeries.slice(-len);

  const k = kalmanHedgeRatio(y, x, { Q: 1e-4, R: 1e-3 });
  const beta = k.beta[k.beta.length - 1];
  const alpha = k.alpha[k.alpha.length - 1];
  const residual = k.resid[k.resid.length - 1];

  const window = k.resid.slice(-Z_LOOKBACK);
  const mu = ss.mean(window);
  const sigma = Math.max(ss.standardDeviation(window), 1e-9);
  const z = (residual - mu) / sigma;

  const tail = k.resid.slice(-6);
  const delta5d = tail.length >= 6
    ? (tail[tail.length - 1] - tail[0]) / Math.max(ss.standardDeviation(tail), 1e-9)
    : 0;

  const cusumWindow = k.resid.slice(-CUSUM_LOOKBACK);
  const cu = cusumPage(cusumWindow, { k: 0.5, h: 5 });

  return {
    pairKey: `${pair.a.iso}-${pair.b.iso}`,
    a: pair.a.iso, b: pair.b.iso, bucket: pair.bucket,
    beta, alpha, residual, z, delta5d,
    halfLife: pair.halfLife ?? Infinity,
    cointPValue: pair.cointPValue ?? 1,
    correlation: pair.correlation ?? 0,
    status: cu.broken ? 'regime-broken' : 'tradeable',
    asOf,
  };
}
