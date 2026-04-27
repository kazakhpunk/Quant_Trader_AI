export type Region = 'LatAm' | 'EMEA' | 'Asia' | 'MENA' | 'Global';
export type IgHy = 'IG' | 'HY';

export type AssetSource = 'fred' | 'yahoo';
export type AssetCategory =
  | 'overall'
  | 'region'
  | 'rating'
  | 'grade'
  | 'sector'
  | 'etf';

/** A spread or yield series we run cointegration on. Replaces the original
 *  Country type; the field name `iso` is kept for back-compat with existing
 *  pipeline/signal code, but it's now a generic short id (e.g. 'fred-asia',
 *  'yahoo-emb') rather than an ISO country code. */
export interface Asset {
  iso: string;             // unique short id used as key
  name: string;            // display label
  category: AssetCategory; // pair-grouping key
  source: AssetSource;
  seriesId: string;        // FRED series ID or Yahoo ticker
  region?: Region;         // optional metadata (regions, IG/HY, rating bucket)
  igHy?: IgHy;
  description?: string;
}

/** Backwards-compat alias — older code (tests, stored docs) still references
 *  `Country`. New code should use `Asset`. */
export type Country = Asset;

export interface PairCandidate {
  a: Asset;
  b: Asset;
  category: AssetCategory; // replaces `bucket`
  cointPValue?: number;
  correlation?: number;
  halfLife?: number;
  beta?: number;
  alpha?: number;
  status: 'candidate' | 'active' | 'rejected';
  rejectReason?: string;
}

export interface SignalRow {
  pairKey: string;
  a: string;
  b: string;
  category: AssetCategory;
  beta: number;
  alpha: number;
  residual: number;
  z: number;
  delta5d: number;
  halfLife: number;
  cointPValue: number;
  correlation: number;
  status: 'tradeable' | 'regime-broken';
  asOf: string;
}

export interface TradingRules {
  entryZ: number;
  exitZ: number;
  stopZ: number;
  /** Block exit (mean-revert OR stop) until the trade is at least this old.
   *  Prevents same-day noise stop-outs immediately after entry. */
  minHoldingDays: number;
  maxHoldingDays: number;
  costBpsRoundTrip: number;
  sizing: 'equalWeight' | 'inverseVol';
}

export interface BacktestConfig {
  rules: TradingRules;
  startDate: string;
  endDate: string;
  notional: number;
  dv01YearsProxy: number;
}

export interface TradeLogEntry {
  pairKey: string;
  entryDate: string;
  exitDate: string;
  entryZ: number;
  exitZ: number;
  pnl: number;
  holdingDays: number;
  exitReason: 'meanRevert' | 'stop' | 'timeout';
}

export interface BacktestMetrics {
  totalReturn: number;
  annReturn: number;
  annVol: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  hitRate: number;
  avgHoldingDays: number;
  turnover: number;
  deflatedSharpe: number;
  numTrades: number;
}

export interface BacktestRun {
  _id?: string;
  userEmail: string;
  ts: string;
  config: BacktestConfig;
  metrics: BacktestMetrics;
  equityCurve: { date: string; nav: number }[];
  trades: TradeLogEntry[];
}
