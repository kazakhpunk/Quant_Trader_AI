import { Country, PairCandidate } from './rv-types';
import { pairsWithinBuckets } from './universe';
import { engleGranger, pearson, ouHalfLife } from './stats';

export interface PipelineConfig {
  cointPMax: number;          // default 0.05
  corrMin: number;            // default 0.7
  halfLifeMax: number;        // default 40
  lookback: number;           // default 250 trading days
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  cointPMax: 0.05, corrMin: 0.7, halfLifeMax: 40, lookback: 250,
};

export function runPairPipeline(
  universe: Country[],
  series: Map<string, number[]>,
  config: PipelineConfig = DEFAULT_PIPELINE_CONFIG,
): PairCandidate[] {
  const candidates = pairsWithinBuckets(universe);
  const out: PairCandidate[] = [];
  for (const c of candidates) {
    const yArr = series.get(c.a.iso);
    const xArr = series.get(c.b.iso);
    if (!yArr || !xArr) continue;
    const len = Math.min(yArr.length, xArr.length, config.lookback);
    if (len < 60) continue;
    const y = yArr.slice(-len), x = xArr.slice(-len);

    let pair: PairCandidate = { a: c.a, b: c.b, bucket: c.bucket, status: 'candidate' };

    // 1. Engle-Granger cointegration
    let eg;
    try { eg = engleGranger(y, x); } catch (e) {
      pair.status = 'rejected'; pair.rejectReason = `coint error: ${(e as Error).message}`; out.push(pair); continue;
    }
    pair.cointPValue = eg.pValue; pair.beta = eg.beta; pair.alpha = eg.alpha;
    if (eg.pValue > config.cointPMax) {
      pair.status = 'rejected'; pair.rejectReason = `coint p=${eg.pValue.toFixed(2)} > ${config.cointPMax}`;
      out.push(pair); continue;
    }

    // 2. Correlation gate on first differences
    const dy: number[] = [], dx: number[] = [];
    for (let i = 1; i < len; i++) { dy.push(y[i] - y[i - 1]); dx.push(x[i] - x[i - 1]); }
    const corr = pearson(dy, dx);
    pair.correlation = corr;
    if (corr < config.corrMin) {
      pair.status = 'rejected'; pair.rejectReason = `corr=${corr.toFixed(2)} < ${config.corrMin}`;
      out.push(pair); continue;
    }

    // 3. OU half-life on residuals
    let hl: number;
    try { hl = ouHalfLife(eg.resid); } catch (e) {
      pair.status = 'rejected'; pair.rejectReason = `half-life error`; out.push(pair); continue;
    }
    pair.halfLife = hl;
    if (!Number.isFinite(hl) || hl > config.halfLifeMax) {
      pair.status = 'rejected'; pair.rejectReason = `half-life=${hl.toFixed(1)} > ${config.halfLifeMax}`;
      out.push(pair); continue;
    }

    pair.status = 'active';
    out.push(pair);
  }
  return out;
}
