import { getApiUrl } from "@/lib/utils";

export interface PlaceOrderInput {
  email: string;
  symbol: string;
  side: "buy" | "sell";
  qty?: number;
  notional?: number;
  orderType: "market" | "limit";
  limitPrice?: number;
  timeInForce: "day" | "gtc";
  isLiveTrading: boolean;
  stopLossPct?: number;
  takeProfitPct?: number;
}

export interface PlaceOrderResult {
  ok: boolean;
  orderId?: string;
  status?: string;
  error?: string;
}

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const res = await fetch(`${getApiUrl()}/api/v1/trade/order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: body.error || `HTTP ${res.status}` };
  return body;
}

export async function fetchLatestPrice(
  symbol: string,
  email: string,
  isLiveTrading: boolean
): Promise<number | null> {
  try {
    // POST instead of GET to avoid GET-with-body inconsistency in browsers/Express.
    const res = await fetch(`${getApiUrl()}/api/v1/price`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker: symbol, email, isLiveTrading }),
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.price ?? null;
  } catch {
    return null;
  }
}
