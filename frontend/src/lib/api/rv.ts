const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export type AssetSource = 'fred' | 'yahoo';
export type AssetCategory = 'overall' | 'region' | 'rating' | 'grade' | 'sector' | 'etf';

export interface SeriesStatsDto {
  mean: number;
  vol: number;
  ret30d: number;       // percent
  autocorr1: number;
  last: number;
  n: number;
}

export interface AssetDto {
  iso: string;            // unique short id
  name: string;
  category: AssetCategory;
  source: AssetSource;
  seriesId: string;
  region?: string;
  igHy?: 'IG' | 'HY';
  description?: string;
  /** Populated by /universe when source-series fetch succeeds. */
  stats?: SeriesStatsDto | null;
}
/** @deprecated use AssetDto */
export type CountryDto = AssetDto;

export interface PairDto {
  a: AssetDto; b: AssetDto; category: AssetCategory;
  cointPValue?: number; correlation?: number; halfLife?: number;
  beta?: number; alpha?: number;
  status: 'candidate' | 'active' | 'rejected';
  rejectReason?: string;
}

export interface SignalDto {
  pairKey: string; a: string; b: string; category: AssetCategory;
  beta: number; alpha: number; residual: number;
  z: number; delta5d: number; halfLife: number;
  cointPValue: number; correlation: number;
  status: 'tradeable' | 'regime-broken'; asOf: string;
}

export interface TradingRulesDto {
  entryZ: number; exitZ: number; stopZ: number;
  maxHoldingDays: number; costBpsRoundTrip: number;
  sizing: 'equalWeight' | 'inverseVol';
}

export interface BacktestConfigDto {
  rules: TradingRulesDto;
  startDate: string; endDate: string;
  notional: number; dv01YearsProxy: number;
}

export interface BacktestMetricsDto {
  totalReturn: number; annReturn: number; annVol: number;
  sharpe: number; sortino: number; maxDrawdown: number;
  hitRate: number; avgHoldingDays: number; turnover: number;
  deflatedSharpe: number; numTrades: number;
}

export interface TradeLogDto {
  pairKey: string; entryDate: string; exitDate: string;
  entryZ: number; exitZ: number; pnl: number;
  holdingDays: number; exitReason: string;
}

export interface BacktestRunDto {
  _id?: string; userEmail: string; ts: string;
  config: BacktestConfigDto;
  metrics: BacktestMetricsDto;
  equityCurve: { date: string; nav: number }[];
  trades: TradeLogDto[];
}

async function http<T>(url: string, init?: RequestInit): Promise<T> {
  // Don't send credentials — RV endpoints are public reads, and
  // combining `credentials: 'include'` with the backend's wildcard
  // `Access-Control-Allow-Origin: *` is rejected by the browser.
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

export const rvApi = {
  getUniverse: () => http<{ universe: AssetDto[] }>(`${API_BASE}/api/v4/rv/universe`),
  getPairs:    () => http<{ pairs: PairDto[]; config: any }>(`${API_BASE}/api/v4/rv/pairs`),
  getSignals:  () => http<{ asOf: string; signals: SignalDto[] }>(`${API_BASE}/api/v4/rv/signals`),
  refreshSignals: () => http<{ asOf: string; signals: SignalDto[] }>(`${API_BASE}/api/v4/rv/signals/refresh`, { method: 'POST' }),
  runBacktest: (config: BacktestConfigDto) =>
    http<{ runId: string; run: BacktestRunDto }>(`${API_BASE}/api/v4/rv/backtests`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(config),
    }),
  listBacktests: () => http<{ runs: BacktestRunDto[] }>(`${API_BASE}/api/v4/rv/backtests`),
  getBacktest: (id: string) => http<{ run: BacktestRunDto }>(`${API_BASE}/api/v4/rv/backtests/${id}`),
};
