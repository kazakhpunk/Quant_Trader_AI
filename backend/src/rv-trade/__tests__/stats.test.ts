import { olsRegression, pearson, adfTest, engleGranger, ouHalfLife, cusumPage } from '../stats';

const linspace = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('olsRegression', () => {
  it('recovers slope and intercept from y = 2x + 3', () => {
    const x = linspace(50);
    const y = x.map(v => 2 * v + 3);
    const r = olsRegression(x, y);
    expect(r.slope).toBeCloseTo(2, 5);
    expect(r.intercept).toBeCloseTo(3, 5);
  });
});

describe('pearson', () => {
  it('returns 1 for identical', () => {
    const x = [1, 2, 3, 4, 5];
    expect(pearson(x, x)).toBeCloseTo(1, 6);
  });
  it('returns -1 for negated', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [5, 4, 3, 2, 1];
    expect(pearson(x, y)).toBeCloseTo(-1, 6);
  });
});

describe('adfTest', () => {
  it('rejects unit root for stationary AR(1) with phi=0.2', () => {
    const n = 250;
    const phi = 0.2;
    const series = [0];
    let prev = 0;
    for (let i = 1; i < n; i++) {
      const next = phi * prev + (Math.random() - 0.5);
      series.push(next);
      prev = next;
    }
    const r = adfTest(series);
    expect(r.tStat).toBeLessThan(-2);          // strongly negative for stationary
    expect(r.pValue).toBeLessThan(0.1);
  });

  it('fails to reject for random walk', () => {
    const n = 250;
    const series = [0];
    for (let i = 1; i < n; i++) series.push(series[i - 1] + (Math.random() - 0.5));
    const r = adfTest(series);
    expect(r.tStat).toBeGreaterThan(-2.5);     // weak; cannot reject unit root
  });
});

describe('engleGranger', () => {
  it('returns small p-value for cointegrated pair', () => {
    const n = 300;
    const x = [0];
    for (let i = 1; i < n; i++) x.push(x[i - 1] + (Math.random() - 0.5));
    const y = x.map(v => 1.2 * v + 5 + (Math.random() - 0.5) * 0.3);
    const r = engleGranger(y, x);
    expect(r.pValue).toBeLessThan(0.1);
    expect(r.beta).toBeCloseTo(1.2, 0);
  });

  it('returns large p-value for independent random walks', () => {
    const n = 300;
    const x = [0], y = [0];
    for (let i = 1; i < n; i++) {
      x.push(x[i - 1] + (Math.random() - 0.5));
      y.push(y[i - 1] + (Math.random() - 0.5));
    }
    const r = engleGranger(y, x);
    expect(r.pValue).toBeGreaterThan(0.1);
  });
});

describe('ouHalfLife', () => {
  it('estimates half-life close to ln(2)/theta for synthetic OU', () => {
    const n = 1000;
    const theta = 0.05;
    const series = [0];
    for (let i = 1; i < n; i++) {
      const dx = -theta * series[i - 1] + (Math.random() - 0.5) * 0.5;
      series.push(series[i - 1] + dx);
    }
    const hl = ouHalfLife(series);
    expect(hl).toBeGreaterThan(5);
    expect(hl).toBeLessThan(30);    // Math.log(2)/0.05 ~= 13.86
  });
});

describe('cusumPage', () => {
  it('detects upward shift', () => {
    const noise = (n: number) => Array.from({ length: n }, () => (Math.random() - 0.5));
    const series = [...noise(60), ...noise(60).map(v => v + 3)];   // shift after 60
    const r = cusumPage(series, { k: 0.5, h: 5 });
    expect(r.maxAbs).toBeGreaterThan(5);
    expect(r.broken).toBe(true);
  });

  it('does not trip on stationary noise', () => {
    const noise = (n: number) => Array.from({ length: n }, () => (Math.random() - 0.5));
    const r = cusumPage(noise(120), { k: 0.5, h: 5 });
    expect(r.broken).toBe(false);
  });
});
