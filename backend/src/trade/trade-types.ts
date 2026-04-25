export interface OrderRequest {
  email: string;
  symbol: string;
  side: "buy" | "sell";
  qty?: number;        // exactly one of qty / notional
  notional?: number;
  orderType: "market" | "limit";
  limitPrice?: number; // required iff orderType === 'limit'
  timeInForce: "day" | "gtc";
  isLiveTrading: boolean;
  stopLossPct?: number;   // % > 0 (e.g. 3 means -3%)
  takeProfitPct?: number; // % > 0
}

export interface OrderResult {
  ok: boolean;
  orderId?: string;
  status?: string;
  error?: string;
}

export interface EngineCaps {
  maxPositionPct: number;
  maxPositions: number;
  perPositionStopLossPct: number;
  perPositionTakeProfitPct: number;
  maxDrawdownPct: number;
}

export const DEFAULT_CAPS: EngineCaps = {
  maxPositionPct: 20,
  maxPositions: 10,
  perPositionStopLossPct: 3,
  perPositionTakeProfitPct: 5,
  maxDrawdownPct: 10,
};

export interface EngineRequest {
  email: string;
  amount: number;
  isLiveTrading: boolean;
  isSentimentEnabled: boolean;
  dryRun?: boolean;
  direction?: "long" | "short" | "both";
  skipHeld?: boolean;
  caps?: Partial<EngineCaps>;
}

export interface EnginePreviewRow {
  ticker: string;
  side: "buy" | "sell";
  composite: number;
  topSignals: string[];
  allocation: number;
  qty: number;
  price: number;
}

export interface EnginePreview {
  rows: EnginePreviewRow[];
  totalAllocated: number;
  totalRequested: number;
  caps: EngineCaps;
}

export function validateOrderRequest(req: Partial<OrderRequest>): string | null {
  if (!req.email) return "email is required";
  if (!req.symbol) return "symbol is required";
  if (req.side !== "buy" && req.side !== "sell") return "side must be buy or sell";
  const hasQty = typeof req.qty === "number" && req.qty > 0;
  const hasNotional = typeof req.notional === "number" && req.notional > 0;
  if (hasQty === hasNotional) return "exactly one of qty or notional is required";
  if (req.orderType !== "market" && req.orderType !== "limit") return "orderType invalid";
  if (req.orderType === "limit" && !(typeof req.limitPrice === "number" && req.limitPrice > 0))
    return "limitPrice required for limit orders";
  if (req.timeInForce !== "day" && req.timeInForce !== "gtc") return "timeInForce invalid";
  if (req.stopLossPct != null && req.stopLossPct <= 0) return "stopLossPct must be > 0";
  if (req.takeProfitPct != null && req.takeProfitPct <= 0) return "takeProfitPct must be > 0";
  return null;
}
