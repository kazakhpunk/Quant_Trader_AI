import * as ss from 'simple-statistics';

export interface OlsResult { slope: number; intercept: number; r2: number; resid: number[]; }
export interface AdfResult { tStat: number; pValue: number; }
export interface EngleGrangerResult { beta: number; alpha: number; resid: number[]; tStat: number; pValue: number; }

// OLS y = a + b*x
export function olsRegression(x: number[], y: number[]): OlsResult {
  if (x.length !== y.length || x.length < 3) throw new Error('olsRegression: insufficient data');
  const n = x.length;
  const xMean = ss.mean(x), yMean = ss.mean(y);
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (x[i] - xMean) * (y[i] - yMean); sxx += (x[i] - xMean) ** 2; }
  const slope = sxy / sxx;
  const intercept = yMean - slope * xMean;
  const yHat = x.map(v => intercept + slope * v);
  const resid = y.map((v, i) => v - yHat[i]);
  const ssTot = y.reduce((s, v) => s + (v - yMean) ** 2, 0);
  const ssRes = resid.reduce((s, v) => s + v * v, 0);
  const r2 = 1 - ssRes / Math.max(ssTot, 1e-12);
  return { slope, intercept, r2, resid };
}

export function pearson(x: number[], y: number[]): number {
  return ss.sampleCorrelation(x, y);
}

// MacKinnon (2010) approximate p-value lookup for ADF tau (no constant, no trend variant
// using small-sample interpolation table for the constant-only model, the most common case)
// Source: MacKinnon "Critical Values for Cointegration Tests", interpolation simplified.
const ADF_CRITICAL_TABLE: Array<[number, number]> = [
  // [tStat, p]   — constant-only ADF distribution
  [-3.43, 0.01], [-2.86, 0.05], [-2.57, 0.10],
  [-2.20, 0.20], [-1.62, 0.40], [-1.00, 0.60],
  [ 0.00, 0.80], [ 1.00, 0.95],
];

function approxPValueFromTable(table: Array<[number, number]>, t: number): number {
  if (t <= table[0][0]) return Math.max(0.001, table[0][1] / 2);
  if (t >= table[table.length - 1][0]) return Math.min(0.999, table[table.length - 1][1]);
  for (let i = 0; i < table.length - 1; i++) {
    const [t1, p1] = table[i], [t2, p2] = table[i + 1];
    if (t >= t1 && t <= t2) {
      const w = (t - t1) / (t2 - t1);
      return p1 + w * (p2 - p1);
    }
  }
  return 0.5;
}

// Simple ADF test with constant, lag = 1
export function adfTest(series: number[]): AdfResult {
  if (series.length < 20) throw new Error('adfTest: need >= 20 obs');
  const n = series.length;
  const dy: number[] = [];
  const yLag: number[] = [];
  const dyLag1: number[] = [];
  for (let i = 2; i < n; i++) {
    dy.push(series[i] - series[i - 1]);
    yLag.push(series[i - 1]);
    dyLag1.push(series[i - 1] - series[i - 2]);
  }
  // multiple regression: dy = a + b*yLag + c*dyLag1  → solve via normal equations 3-var
  const m = dy.length;
  const X: number[][] = dy.map((_, i) => [1, yLag[i], dyLag1[i]]);
  const beta = solveLinearLeastSquares(X, dy);
  // Compute SE of b (coefficient on yLag) via residual variance & (X'X)^-1 diagonal[1]
  const yHat = X.map(row => row[0] * beta[0] + row[1] * beta[1] + row[2] * beta[2]);
  const resid = dy.map((v, i) => v - yHat[i]);
  const sigma2 = resid.reduce((s, v) => s + v * v, 0) / (m - 3);
  const xtx = matMul(transpose(X), X);
  const xtxInv = invert3x3(xtx);
  const seB = Math.sqrt(sigma2 * xtxInv[1][1]);
  const tStat = beta[1] / seB;
  const pValue = approxPValueFromTable(ADF_CRITICAL_TABLE, tStat);
  return { tStat, pValue };
}

const ENGLE_GRANGER_TABLE: Array<[number, number]> = [
  // Approximate critical values for 2-variable EG residual ADF
  [-3.90, 0.01], [-3.34, 0.05], [-3.04, 0.10],
  [-2.50, 0.20], [-2.00, 0.40], [-1.40, 0.60],
  [ 0.00, 0.90],
];

export function engleGranger(y: number[], x: number[]): EngleGrangerResult {
  const ols = olsRegression(x, y);
  const adf = adfTest(ols.resid);
  return {
    beta: ols.slope,
    alpha: ols.intercept,
    resid: ols.resid,
    tStat: adf.tStat,
    pValue: approxPValueFromTable(ENGLE_GRANGER_TABLE, adf.tStat),
  };
}

// Half-life from AR(1) on Δy = a + b*y_{t-1}; theta = -b; HL = ln(2) / theta
export function ouHalfLife(series: number[]): number {
  if (series.length < 30) throw new Error('ouHalfLife: need >= 30 obs');
  const dy: number[] = [], yLag: number[] = [];
  for (let i = 1; i < series.length; i++) { dy.push(series[i] - series[i - 1]); yLag.push(series[i - 1]); }
  const ols = olsRegression(yLag, dy);
  const theta = -ols.slope;
  if (theta <= 0) return Infinity;
  return Math.log(2) / theta;
}

export interface CusumOptions { k: number; h: number; }
export interface CusumResult { broken: boolean; maxAbs: number; }

export function cusumPage(series: number[], opts: CusumOptions): CusumResult {
  if (series.length < 10) throw new Error('cusumPage: need >= 10 obs');
  const mu = ss.mean(series);
  const sigma = Math.max(ss.standardDeviation(series), 1e-9);
  let sHi = 0, sLo = 0, maxAbs = 0;
  for (const v of series) {
    const z = (v - mu) / sigma;
    sHi = Math.max(0, sHi + z - opts.k);
    sLo = Math.min(0, sLo + z + opts.k);
    maxAbs = Math.max(maxAbs, sHi, -sLo);
  }
  return { broken: maxAbs > opts.h, maxAbs };
}

// --- linear algebra helpers ---
function transpose(m: number[][]): number[][] {
  const rows = m.length, cols = m[0].length;
  const t: number[][] = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) t[j][i] = m[i][j];
  return t;
}

function matMul(a: number[][], b: number[][]): number[][] {
  const ar = a.length, ac = a[0].length, bc = b[0].length;
  const r: number[][] = Array.from({ length: ar }, () => new Array(bc).fill(0));
  for (let i = 0; i < ar; i++) for (let j = 0; j < bc; j++) {
    let s = 0;
    for (let k = 0; k < ac; k++) s += a[i][k] * b[k][j];
    r[i][j] = s;
  }
  return r;
}

function invert3x3(m: number[][]): number[][] {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-12) throw new Error('invert3x3: singular');
  const inv = [
    [(e * i - f * h), -(b * i - c * h), (b * f - c * e)],
    [-(d * i - f * g), (a * i - c * g), -(a * f - c * d)],
    [(d * h - e * g), -(a * h - b * g), (a * e - b * d)],
  ];
  return inv.map(row => row.map(v => v / det));
}

function solveLinearLeastSquares(X: number[][], y: number[]): number[] {
  const Xt = transpose(X);
  const XtX = matMul(Xt, X);
  const XtXinv = invert3x3(XtX);
  const Xty = matMul(Xt, y.map(v => [v]));
  const beta = matMul(XtXinv, Xty);
  return beta.map(row => row[0]);
}
