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

export async function closeAllPositions(
  email: string,
  isLiveTrading: boolean
): Promise<{ ok: boolean; closed?: any; error?: string }> {
  const res = await fetch(`${getApiUrl()}/api/v1/positions/close-all`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, isLiveTrading }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: body.error || `HTTP ${res.status}` };
  return body;
}

export async function cancelAllOrders(
  email: string,
  isLiveTrading: boolean
): Promise<{ ok: boolean; cancelled?: any; error?: string }> {
  const res = await fetch(`${getApiUrl()}/api/v1/orders/cancel-all`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, isLiveTrading }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: body.error || `HTTP ${res.status}` };
  return body;
}

export interface PositionRow {
  symbol: string;
  qty: string;
  side: "long" | "short";
  avg_entry_price: string;
  current_price?: string;
  market_value?: string;
  unrealized_pl?: string;
  unrealized_plpc?: string;
}

export interface OpenOrderRow {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  qty?: string;
  notional?: string;
  type: string;
  time_in_force: string;
  status: string;
  submitted_at: string;
}

export async function listPositions(
  email: string,
  isLiveTrading: boolean
): Promise<{ ok: boolean; positions?: PositionRow[]; error?: string }> {
  const res = await fetch(`${getApiUrl()}/api/v1/positions/list`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, isLiveTrading }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: body.error || `HTTP ${res.status}` };
  return body;
}

export async function listOpenOrders(
  email: string,
  isLiveTrading: boolean
): Promise<{ ok: boolean; orders?: OpenOrderRow[]; error?: string }> {
  const res = await fetch(`${getApiUrl()}/api/v1/orders/open`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, isLiveTrading }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: body.error || `HTTP ${res.status}` };
  return body;
}

export async function closePosition(
  email: string,
  isLiveTrading: boolean,
  symbol: string
): Promise<{ ok: boolean; closed?: any; error?: string }> {
  const res = await fetch(`${getApiUrl()}/api/v1/positions/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, isLiveTrading, symbol }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: body.error || `HTTP ${res.status}` };
  return body;
}

export async function cancelOrder(
  email: string,
  isLiveTrading: boolean,
  orderId: string
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${getApiUrl()}/api/v1/orders/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, isLiveTrading, orderId }),
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
