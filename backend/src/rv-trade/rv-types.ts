export type Region = 'LatAm' | 'EMEA' | 'Asia' | 'MENA';
export type IgHy = 'IG' | 'HY';

export type Bucket =
  | 'oilExporters'
  | 'commodityExporters'
  | 'latamIG'
  | 'latamHY'
  | 'cee'
  | 'gcc'
  | 'asiaIG'
  | 'frontier';

export interface Country {
  iso: string;
  name: string;
  region: Region;
  rating: number;            // S&P scale 1 (AAA) ... 22 (D)
  oilExporter: boolean;
  commodityExporter: boolean;
  igHy: IgHy;
  debtToGdp: number;         // percent
  fredOasSeriesId: string;
}

export interface PairCandidate {
  a: Country;
  b: Country;
  bucket: Bucket;
  cointPValue?: number;
  correlation?: number;
  halfLife?: number;
  beta?: number;
  alpha?: number;
  status: 'candidate' | 'active' | 'rejected';
  rejectReason?: string;
}

export interface SignalRow {
  pairKey: string;            // `${aIso}-${bIso}`
  a: string;
  b: string;
  bucket: Bucket;
  beta: number;
  alpha: number;
  residual: number;
  z: number;
  delta5d: number;
  halfLife: number;
  cointPValue: number;
  correlation: number;
  status: 'tradeable' | 'regime-broken';
  asOf: string;               // ISO date
}

export interface TradingRules {
  entryZ: number;             // default 2.0
  exitZ: number;              // default 0.5
  stopZ: number;              // default 3.5
  maxHoldingDays: number;     // default 60
  costBpsRoundTrip: number;   // default 30
  sizing: 'equalWeight' | 'inverseVol';
}

export interface BacktestConfig {
  rules: TradingRules;
  startDate: string;          // ISO
  endDate: string;            // ISO
  notional: number;           // total portfolio notional in USD
  dv01YearsProxy: number;     // default 7
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
