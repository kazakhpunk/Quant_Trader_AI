import { kalmanHedgeRatio } from '../kalman';

function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

describe('kalmanHedgeRatio', () => {
  it('converges to true beta for stationary linear relation', () => {
    const rand = seededRand(101);
    const n = 500;
    const x: number[] = [], y: number[] = [];
    const trueAlpha = 5, trueBeta = 1.3;
    for (let i = 0; i < n; i++) {
      const xi = rand() * 100;
      x.push(xi);
      y.push(trueAlpha + trueBeta * xi + (rand() - 0.5) * 0.5);
    }
    const out = kalmanHedgeRatio(y, x);
    const tail = out.beta.slice(-50);
    const tailMean = tail.reduce((s, v) => s + v, 0) / tail.length;
    expect(tailMean).toBeCloseTo(trueBeta, 1);
  });

  it('tracks drifting beta', () => {
    const rand = seededRand(202);
    const n = 600;
    const x: number[] = [], y: number[] = [];
    for (let i = 0; i < n; i++) {
      const xi = i * 0.1 + rand();
      x.push(xi);
      const beta = i < 300 ? 1.0 : 1.6;
      y.push(2 + beta * xi + (rand() - 0.5) * 0.2);
    }
    const out = kalmanHedgeRatio(y, x, { Q: 1e-3, R: 1e-3 });
    expect(out.beta[100]).toBeCloseTo(1.0, 0);
    expect(out.beta[n - 1]).toBeCloseTo(1.6, 0);
  });

  it('residual length matches input', () => {
    const x = Array.from({ length: 50 }, (_, i) => i);
    const y = x.map(v => 2 * v + 1);
    const out = kalmanHedgeRatio(y, x);
    expect(out.resid).toHaveLength(50);
    expect(out.beta).toHaveLength(50);
    expect(out.alpha).toHaveLength(50);
  });
});
