"use client";

import React, { useCallback, useState, useEffect } from "react";
import { Loader } from "@/components/v4/loader";
import Link from "next/link";
import { useUser } from "@clerk/clerk-react";
import { cn } from "@/lib/utils";
import { useOrderDrawer } from "@/lib/order-drawer-store";
import { getRatings, RatingRow, VISIBLE_DIMENSIONS } from "@/lib/api/ratings";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PnlChart } from "@/components/v4/dashboard/pnl-chart";
import { PositionPie } from "@/components/v4/dashboard/position-pie";
import { closePosition, cancelOrder } from "@/lib/api/orders";
import { Switch } from "@/components/ui/switch";
import { X } from "lucide-react";
import { useConfirm } from "@/components/v4/confirm-dialog";

interface AccountData {
  portfolio_value: number;
  cash: number;
}

interface PositionData {
  symbol: string;
  qty: number;
  avg_entry_price: number;
  current_price: number;
  market_value: number;
  unrealized_pl: number;
}

interface OrderData {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  type?: string;             // market / limit / stop / ...
  qty: number;
  filled_qty: number;
  status: string;
}

interface DashboardData {
  account: AccountData;
  positions: PositionData[];
  orders: OrderData[];
}

const getApiUrl = () => {
  return process.env.NODE_ENV === "development"
    ? "http://localhost:8000"
    : "https://quanttraderai-production.up.railway.app";
};

const fetchDashboardData = async (
  token: string,
  isLiveTrading: boolean
): Promise<DashboardData | null> => {
  try {
    const response = await fetch(`${getApiUrl()}/api/v4/dashboard-data`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isLive: isLiveTrading }),
    });
    if (!response.ok) throw new Error("Failed to fetch dashboard data");
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return null;
  }
};

const TRADING_MODE_KEY = "qt_isLiveTrading";

const safeNumber = (value: unknown): number => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatCurrency = (value: unknown) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(safeNumber(value));

const formatSignedCurrency = (value: unknown) => {
  const n = safeNumber(value);
  const formatted = formatCurrency(Math.abs(n));
  if (n > 0) return `+${formatted}`;
  if (n < 0) return `−${formatted}`;
  return formatted;
};

const formatPercent = (value: unknown) =>
  new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 2,
    signDisplay: "exceptZero",
  }).format(safeNumber(value) / 100);

const Dashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isLiveTrading, setIsLiveTrading] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(TRADING_MODE_KEY) === "1";
  });
  const { isSignedIn, user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("alpaca_access_token");
    if (!token) {
      setData(null);
      return;
    }
    const dashboardData = await fetchDashboardData(token, isLiveTrading);
    setData(dashboardData);
  }, [isLiveTrading]);

  useEffect(() => {
    localStorage.setItem(TRADING_MODE_KEY, isLiveTrading ? "1" : "0");
    const loadData = async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    };
    loadData();
  }, [isLiveTrading, refresh]);

  const { confirm, dialog: confirmDialog, close: closeConfirm } = useConfirm();

  // Optimistic mutations — Alpaca's cancel/liquidate go through pending
  // states (pending_cancel, the close's market-sell sitting in the order
  // book until it fills), so a refresh right after the API call still
  // returns the row. Drop the row from local state immediately, then
  // background-refresh to catch backend errors and reconcile.
  const removePositionLocally = (symbol: string) =>
    setData((prev) =>
      prev ? { ...prev, positions: prev.positions.filter((p) => p.symbol !== symbol) } : prev,
    );
  const removeOrderLocally = (orderId: string) =>
    setData((prev) =>
      prev ? { ...prev, orders: prev.orders.filter((o) => o.id !== orderId) } : prev,
    );

  const handleClosePosition = async (symbol: string) => {
    if (!email) return;
    const ok = await confirm({
      title: `Close ${symbol} at market?`,
      description: (
        <>
          Sells the entire {symbol} position via Alpaca market order.
          <span className="mt-2 block font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            This is irreversible. Any related open orders are cancelled too.
          </span>
        </>
      ),
      confirmLabel: "Close position",
      intent: "destructive",
    });
    if (!ok) return;
    setBusyId(`pos:${symbol}`);
    // Optimistic: drop the row immediately so the UI feels responsive
    removePositionLocally(symbol);
    const r = await closePosition(email, isLiveTrading, symbol);
    setBusyId(null);
    closeConfirm();
    if (!r.ok) {
      alert(r.error || `Failed to close ${symbol}`);
    }
    // Background refresh to reconcile with Alpaca's actual state
    await refresh();
  };

  const handleCancelOrder = async (orderId: string, symbol: string) => {
    if (!email) return;
    const ok = await confirm({
      title: `Cancel open order on ${symbol}?`,
      description: (
        <>
          The order is removed from the book before it can fill.
          <span className="mt-1 block font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Already-filled portions stay on your account.
          </span>
        </>
      ),
      confirmLabel: "Cancel order",
      intent: "destructive",
    });
    if (!ok) return;
    setBusyId(`ord:${orderId}`);
    removeOrderLocally(orderId);
    const r = await cancelOrder(email, isLiveTrading, orderId);
    setBusyId(null);
    closeConfirm();
    if (!r.ok) {
      alert(r.error || `Failed to cancel order`);
    }
    await refresh();
  };

  const [ratings, setRatings] = useState<Record<string, RatingRow>>({});
  useEffect(() => {
    getRatings().then((rows) => {
      const byTicker: Record<string, RatingRow> = {};
      rows.forEach((r) => { byTicker[r.ticker] = r; });
      setRatings(byTicker);
    }).catch(() => {});
  }, []);

  const openDrawer = useOrderDrawer((s) => s.open);

  if (loading) {
    return <Loader height="60vh" message="Loading dashboard…" />;
  }

  if (!data || !isSignedIn) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-8 px-2 py-6 md:px-4 md:py-10">
        {isSignedIn && (
          <DashboardModeSwitch
            isLiveTrading={isLiveTrading}
            onChange={setIsLiveTrading}
          />
        )}
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">No data yet</h2>
          <p className="mt-3 text-muted-foreground">
            Place your first {isLiveTrading ? "live" : "paper"} trade to populate the dashboard.
          </p>
          <div className="mt-6">
            <Link
              href="/trade"
              className="inline-flex items-center text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              Go to Trade →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show all open positions (no P&L filter), ordered by composite rating
  // (highest first) so the strongest-rated holdings surface at the top.
  // Tickers without a rating yet drop to the bottom; ties broken by symbol
  // so the ordering is stable across refreshes.
  const positions = [...(data.positions ?? [])].sort((a, b) => {
    const ra = ratings[a.symbol]?.composite ?? -Infinity;
    const rb = ratings[b.symbol]?.composite ?? -Infinity;
    if (rb !== ra) return rb - ra;
    return a.symbol.localeCompare(b.symbol);
  });
  // Sum of qty × current_price across open positions = "what your
  // positions are worth right now" (your notional exposure). Computed
  // directly rather than reading Alpaca's market_value field so it stays
  // consistent even if a position's market_value is missing or stale.
  const totalPositionsValue = positions.reduce(
    (sum, p) =>
      sum + Math.abs(safeNumber(p.qty) * safeNumber(p.current_price)),
    0
  );
  const orders = data.orders ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-12 px-2 py-6 md:px-4 md:py-10">
      <DashboardModeSwitch
        isLiveTrading={isLiveTrading}
        onChange={setIsLiveTrading}
      />

      {/* KPI strip */}
      <section>
        <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border/60 md:grid-cols-4">
          <Kpi
            label="Total account value"
            value={formatCurrency(data.account.portfolio_value)}
            className="border-b border-r border-border/60 md:border-b-0"
          />
          <Kpi
            label="Available cash"
            value={formatCurrency(data.account.cash)}
            className="border-b border-border/60 md:border-b-0 md:border-r"
          />
          <Kpi
            label="Positions value"
            value={formatCurrency(totalPositionsValue)}
            sub="market value · live"
            className="border-r border-border/60"
          />
          <Kpi
            label="Open positions"
            value={positions.length.toString()}
            sub={`${positions.length === 1 ? "asset" : "assets"} held`}
          />
        </div>
      </section>

      {/* P&L over time + Position distribution */}
      <section className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <PnlChart isLiveTrading={isLiveTrading} />
        </div>
        <div className="overflow-hidden rounded-lg border border-border/60 lg:col-span-2">
          <div className="border-b border-border/60 bg-muted/20 px-5 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Position mix
            </p>
            <h3 className="mt-1 text-base font-semibold tracking-tight">
              Where the capital is.
            </h3>
          </div>
          <div className="p-5">
            <PositionPie positions={positions.map((p) => ({ symbol: p.symbol, market_value: safeNumber(p.market_value) }))} />
          </div>
        </div>
      </section>

      {/* Open positions */}
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Open positions</h2>
          <div className="flex items-baseline gap-4">
            <Link href="/analysis/ratings" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
              View full ratings →
            </Link>
            <span className="font-mono text-xs text-muted-foreground">
              {positions.length} {positions.length === 1 ? "position" : "positions"}
            </span>
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-lg border border-border/60">
          <table className="w-full table-auto">
            <thead className="bg-muted/30">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Symbol</th>
                <th className="px-4 py-3 text-right font-medium">Qty</th>
                <th className="hidden px-4 py-3 text-right font-medium md:table-cell">
                  Entry
                </th>
                <th className="hidden px-4 py-3 text-right font-medium md:table-cell">
                  Current
                </th>
                <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">
                  Market value
                </th>
                <th className="px-4 py-3 text-right font-medium">P&amp;L</th>
                <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">
                  %
                </th>
                <th className="hidden px-4 py-3 text-right font-medium md:table-cell">Rating</th>
                <th className="w-16 px-4 py-3 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {positions.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    No open positions yet.
                  </td>
                </tr>
              ) : (
                positions.map((p) => {
                  const mv = safeNumber(p.market_value);
                  const pl = safeNumber(p.unrealized_pl);
                  // |qty| so shorts (negative qty) report cost basis as a
                  // positive dollars-at-risk number, otherwise the % comes
                  // out sign-flipped from the dollar P&L.
                  const cost =
                    Math.abs(safeNumber(p.avg_entry_price) * safeNumber(p.qty));
                  const pct = cost ? (pl / cost) * 100 : 0;
                  const positive = pl >= 0;
                  return (
                    <tr
                      key={p.symbol}
                      className="cursor-pointer transition-colors duration-150 hover:bg-muted/30"
                      onClick={() => openDrawer(p.symbol)}
                    >
                      <td className="px-4 py-3 font-medium">{p.symbol}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {p.qty}
                      </td>
                      <td className="hidden px-4 py-3 text-right font-mono tabular-nums md:table-cell">
                        {formatCurrency(p.avg_entry_price)}
                      </td>
                      <td className="hidden px-4 py-3 text-right font-mono tabular-nums md:table-cell">
                        {formatCurrency(p.current_price)}
                      </td>
                      <td className="hidden px-4 py-3 text-right font-mono tabular-nums lg:table-cell">
                        {formatCurrency(p.market_value)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right font-mono tabular-nums",
                          positive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        )}
                      >
                        {formatSignedCurrency(pl)}
                      </td>
                      <td
                        className={cn(
                          "hidden px-4 py-3 text-right font-mono tabular-nums sm:table-cell",
                          positive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        )}
                      >
                        {formatPercent(pct)}
                      </td>
                      <td className="hidden px-4 py-3 text-right md:table-cell">
                        <RatingCell row={ratings[p.symbol]} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleClosePosition(p.symbol); }}
                          disabled={busyId === `pos:${p.symbol}`}
                          className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition hover:border-rose-400/60 hover:bg-rose-50/50 hover:text-rose-700 disabled:opacity-50 dark:hover:border-rose-700/60 dark:hover:bg-rose-950/30 dark:hover:text-rose-300"
                          title={`Close ${p.symbol} at market`}
                        >
                          <X className="h-3 w-3" />
                          {busyId === `pos:${p.symbol}` ? "…" : "Close"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Open orders */}
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Open orders</h2>
          <span className="font-mono text-xs text-muted-foreground">
            {orders.length} {orders.length === 1 ? "order" : "orders"}
          </span>
        </div>
        <div className="mt-4 overflow-hidden rounded-lg border border-border/60">
          <table className="w-full table-fixed">
            <thead className="bg-muted/30">
              <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                <th className="w-1/6 px-4 py-3 text-left font-medium">Symbol</th>
                <th className="w-1/6 px-4 py-3 text-center font-medium">Type</th>
                <th className="w-1/6 px-4 py-3 text-center font-medium">Qty</th>
                <th className="hidden w-1/6 px-4 py-3 text-center font-medium md:table-cell">
                  Filled
                </th>
                <th className="w-1/6 px-4 py-3 text-center font-medium">Status</th>
                <th className="w-1/6 px-4 py-3 text-center font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    No open orders.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr
                    key={o.id}
                    className="cursor-pointer transition-colors duration-150 hover:bg-muted/30"
                    onClick={() => openDrawer(o.symbol)}
                  >
                    <td className="px-4 py-3 font-medium">{o.symbol}</td>
                    <td className="px-4 py-3 text-center">
                      <SideBadge side={o.side} />
                    </td>
                    <td className="px-4 py-3 text-center font-mono tabular-nums">
                      {o.qty}
                    </td>
                    <td className="hidden px-4 py-3 text-center font-mono tabular-nums md:table-cell">
                      {o.filled_qty}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleCancelOrder(o.id, o.symbol); }}
                        disabled={busyId === `ord:${o.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition hover:border-rose-400/60 hover:bg-rose-50/50 hover:text-rose-700 disabled:opacity-50 dark:hover:border-rose-700/60 dark:hover:bg-rose-950/30 dark:hover:text-rose-300"
                        title={`Cancel order on ${o.symbol}`}
                      >
                        <X className="h-3 w-3" />
                        {busyId === `ord:${o.id}` ? "…" : "Cancel"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {confirmDialog}
    </div>
  );
};

function DashboardModeSwitch({
  isLiveTrading,
  onChange,
}: {
  isLiveTrading: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm">
      <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            Brokerage mode
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">
            {isLiveTrading ? "Live account" : "Paper account"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Dashboard, charts, positions, and order actions are scoped to this mode.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-full border border-border/70 bg-muted/30 p-1.5">
          <span
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors",
              !isLiveTrading
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            Paper
          </span>
          <Switch
            checked={isLiveTrading}
            onCheckedChange={onChange}
            aria-label="Toggle paper or live dashboard mode"
            className="data-[state=checked]:bg-rose-600 data-[state=unchecked]:bg-emerald-600"
          />
          <span
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors",
              isLiveTrading
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            Live
          </span>
        </div>
      </div>
    </section>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "positive" | "negative" | "default";
  className?: string;
}) {
  return (
    <div className={cn("p-5 md:p-6", className)}>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-3 text-2xl font-semibold tabular-nums tracking-tight md:text-3xl",
          tone === "positive" && "text-emerald-600 dark:text-emerald-400",
          tone === "negative" && "text-rose-600 dark:text-rose-400"
        )}
      >
        {value}
      </p>
      {sub && (
        <p
          className={cn(
            "mt-1 font-mono text-xs",
            tone === "positive" && "text-emerald-600 dark:text-emerald-400",
            tone === "negative" && "text-rose-600 dark:text-rose-400",
            tone === "default" && "text-muted-foreground"
          )}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

function SideBadge({ side }: { side?: "buy" | "sell" }) {
  const isSell = side === "sell";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        isSell
          ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      )}
    >
      {isSell ? "Sell" : "Buy"}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  // Neutral default; semantic palettes for terminal states; sky-blue (not
  // amber) for in-flight pending states — reads as "in progress" without
  // the warning vibe yellow tends to give.
  let cls = "border border-border/60 text-muted-foreground";
  if (s === "filled" || s === "closed") {
    cls =
      "border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  } else if (s === "canceled" || s === "rejected" || s === "expired") {
    cls = "border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400";
  } else if (s === "new" || s === "accepted" || s === "pending_new") {
    cls =
      "border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400";
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        cls
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function RatingCell({ row }: { row: RatingRow | undefined }) {
  if (!row) return <span className="text-muted-foreground">—</span>;
  // Drop the amber middle band — it read as a warning. Mid scores now use
  // a neutral pill so "average rating" looks descriptive, not cautionary.
  const cls =
    row.composite >= 75 ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
    : row.composite >= 50 ? "border border-border/60 text-foreground"
    : "border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400";
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 font-mono text-xs", cls)}>
            {row.composite}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <ul className="text-xs">
            {VISIBLE_DIMENSIONS.map((d) => (
              <li key={d} className="flex justify-between gap-4">
                <span className="capitalize text-muted-foreground">{d}</span>
                <span className="font-mono tabular-nums">{Math.round(row.scores[d])}</span>
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default Dashboard;
