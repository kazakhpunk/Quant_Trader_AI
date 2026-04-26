import { buildSignal } from '../signal-service';
import { Asset, PairCandidate } from '../rv-types';

function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const A: Asset = { iso: 'AAA', name: 'A', category: 'rating', source: 'fred', seriesId: 'A' };
const B: Asset = { iso: 'BBB', name: 'B', category: 'rating', source: 'fred', seriesId: 'B' };

describe('buildSignal', () => {
  const pair: PairCandidate = { a: A, b: B, category: 'rating', status: 'active', cointPValue: 0.02, correlation: 0.85, halfLife: 25, beta: 1.1, alpha: 5 };

  it('produces tradeable signal for stationary residual at 0', () => {
    const rand = seededRand(31);
    const n = 300;
    const x: number[] = [], y: number[] = [];
    for (let i = 0; i < n; i++) {
      const xi = 100 + Math.sin(i / 20) * 5;
      x.push(xi);
      y.push(5 + 1.1 * xi + (rand() - 0.5) * 0.5);
    }
    const sig = buildSignal(pair, y, x, '2026-04-25');
    expect(sig).not.toBeNull();
    expect(sig!.status).toBe('tradeable');
    expect(Math.abs(sig!.z)).toBeLessThan(2);
  });

  it('flags regime-broken when CUSUM trips', () => {
    const rand = seededRand(99);
    const n = 300;
    const x: number[] = [], y: number[] = [];
    for (let i = 0; i < n; i++) {
      const xi = 100 + Math.sin(i / 20) * 5;
      x.push(xi);
      const shock = i > 200 ? 30 : 0;       // structural break
      y.push(5 + 1.1 * xi + shock + (rand() - 0.5) * 0.3);
    }
    const sig = buildSignal(pair, y, x, '2026-04-25');
    expect(sig!.status).toBe('regime-broken');
  });

  it('returns null for series too short', () => {
    expect(buildSignal(pair, [1, 2], [3, 4], '2026-04-25')).toBeNull();
  });
});
