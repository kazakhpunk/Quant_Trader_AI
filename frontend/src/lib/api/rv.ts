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
  minHoldingDays: number;
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

// Module-level in-flight tracking so two simultaneous mounts (e.g. React strict
// mode double-effect) share the same network request instead of racing.
const inflight = new Map<string, Promise<any>>();

/** sessionStorage-backed cache + in-flight de-dup for read-only RV endpoints.
 *  The backend has a 24h Mongo cache for the same payload — this layer just
 *  saves the network round-trip on repeat mounts and page navigations within
 *  the same browser session. */
export function readCache<T>(key: string, maxAgeMs: number): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { ts, value } = JSON.parse(raw) as { ts: number; value: T };
    if (Date.now() - ts > maxAgeMs) return null;
    return value;
  } catch { return null; }
}

function writeCache<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), value }));
  } catch { /* quota / private mode */ }
}

async function cached<T>(key: string, maxAgeMs: number, fetcher: () => Promise<T>): Promise<T> {
  const hit = readCache<T>(key, maxAgeMs);
  if (hit) return hit;
  const inflightHit = inflight.get(key) as Promise<T> | undefined;
  if (inflightHit) return inflightHit;
  const p = fetcher().then((v) => { writeCache(key, v); return v; })
                    .finally(() => { inflight.delete(key); });
  inflight.set(key, p);
  return p;
}

// 30-minute client TTL: PCA inputs only change once per trading day on the
// backend, but we keep the client TTL shorter than that so a manual refresh
// or a stats correction propagates within the session.
const UNIVERSE_STATS_TTL_MS = 30 * 60 * 1000;

export const rvApi = {
  getUniverse: () => http<{ universe: AssetDto[] }>(`${API_BASE}/api/v4/rv/universe`),
  getUniverseStats: () =>
    cached(
      'rv:universe-stats',
      UNIVERSE_STATS_TTL_MS,
      () => http<{ stats: Record<string, SeriesStatsDto | null> }>(`${API_BASE}/api/v4/rv/universe/stats`),
    ),
  /** Skip the client cache and force a fresh round-trip. Useful for an
   *  explicit "refresh" affordance later. */
  refreshUniverseStats: () => {
    if (typeof window !== 'undefined') sessionStorage.removeItem('rv:universe-stats');
    return http<{ stats: Record<string, SeriesStatsDto | null> }>(`${API_BASE}/api/v4/rv/universe/stats`);
  },
  getPairs:    () => http<{ pairs: PairDto[]; config: any }>(`${API_BASE}/api/v4/rv/pairs`),
  getSignals:  () => http<{ asOf: string; signals: SignalDto[] }>(`${API_BASE}/api/v4/rv/signals`),
  refreshSignals: () => http<{ asOf: string; signals: SignalDto[] }>(`${API_BASE}/api/v4/rv/signals/refresh`, { method: 'POST' }),
  runBacktest: (config: BacktestConfigDto) =>
    http<{ runId: string; run: BacktestRunDto }>(`${API_BASE}/api/v4/rv/backtests`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(config),
    }),
  listBacktests: () => http<{ runs: BacktestRunDto[] }>(`${API_BASE}/api/v4/rv/backtests`),
  getBacktest: (id: string) => http<{ run: BacktestRunDto }>(`${API_BASE}/api/v4/rv/backtests/${id}`),
  deleteBacktest: (id: string) =>
    http<{ ok: true }>(`${API_BASE}/api/v4/rv/backtests/${id}`, { method: "DELETE" }),
};
