export type Stock = {
  ticker: string;
  sma20: number;
  sma50: number;
  ema50: number;
  ema20: number;
  rsi14: number;
  peRatio: number;
  pegRatio: number;
  profitMargin: number;
  dividendYield: number; 
  payoutRatio: number;
  revenue: number; 
  freeCashFlow: number;
  sentiment?: number;
}

export interface AnalysisResult {
  longCandidates: Stock[];
  shortCandidates: Stock[];
}