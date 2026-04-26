import { runPairPipeline, PipelineConfig } from '../pair-pipeline';
import { Country } from '../rv-types';

const COUNTRY_A: Country = { iso: 'AAA', name: 'A', region: 'LatAm', rating: 11, oilExporter: false, commodityExporter: true, igHy: 'HY', debtToGdp: 50, fredOasSeriesId: 'A' };
const COUNTRY_B: Country = { iso: 'BBB', name: 'B', region: 'LatAm', rating: 11, oilExporter: false, commodityExporter: true, igHy: 'HY', debtToGdp: 50, fredOasSeriesId: 'B' };
const COUNTRY_C: Country = { iso: 'CCC', name: 'C', region: 'Asia', rating: 5,  oilExporter: false, commodityExporter: false, igHy: 'IG', debtToGdp: 50, fredOasSeriesId: 'C' };

function genWalk(n: number, seed = 1): number[] {
  let s = 100, out: number[] = [];
  let x = seed;
  for (let i = 0; i < n; i++) {
    x = (x * 9301 + 49297) % 233280;
    s += (x / 233280 - 0.5) * 0.5;
    out.push(s);
  }
  return out;
}

function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

describe('pair pipeline', () => {
  it('keeps cointegrated, correlated, mean-reverting pair', () => {
    const rand = seededRand(7);
    const x = genWalk(400, 1);
    const y = x.map(v => 1.1 * v + 5 + (rand() - 0.5) * 0.3);   // cointegrated with x
    const series = new Map<string, number[]>([['A', y], ['B', x], ['C', genWalk(400, 99)]]);
    const config: PipelineConfig = {
      cointPMax: 0.10, corrMin: 0.5, halfLifeMax: 60,
      lookback: 250,
    };
    const pairs = runPairPipeline([COUNTRY_A, COUNTRY_B, COUNTRY_C], series, config);
    const ab = pairs.find(p => (p.a.iso === 'AAA' && p.b.iso === 'BBB') || (p.a.iso === 'BBB' && p.b.iso === 'AAA'));
    expect(ab).toBeTruthy();
    expect(ab!.status).toBe('active');
  });

  it('rejects pair with no co-movement', () => {
    const series = new Map<string, number[]>([
      ['A', genWalk(400, 1)], ['B', genWalk(400, 50)], ['C', genWalk(400, 99)],
    ]);
    const config: PipelineConfig = { cointPMax: 0.05, corrMin: 0.7, halfLifeMax: 40, lookback: 250 };
    const pairs = runPairPipeline([COUNTRY_A, COUNTRY_B, COUNTRY_C], series, config);
    const rejected = pairs.filter(p => p.status === 'rejected');
    expect(rejected.length).toBeGreaterThan(0);
  });

  it('drops countries without time series silently', () => {
    const series = new Map<string, number[]>([['A', genWalk(400, 1)]]);
    const config: PipelineConfig = { cointPMax: 0.05, corrMin: 0.7, halfLifeMax: 40, lookback: 250 };
    const pairs = runPairPipeline([COUNTRY_A, COUNTRY_B, COUNTRY_C], series, config);
    expect(pairs).toHaveLength(0);
  });
});
