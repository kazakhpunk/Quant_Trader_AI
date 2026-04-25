"use client";

import React, { useState, useEffect } from "react";
import { CircularProgress } from "@mui/material";
import Link from "next/link";
import { useUser } from "@clerk/clerk-react";
import { cn } from "@/lib/utils";

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
  orderType: string;
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
  token: string
): Promise<DashboardData | null> => {
  try {
    const response = await fetch(`${getApiUrl()}/api/v4/dashboard-data`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isLive: false }),
    });
    if (!response.ok) throw new Error("Failed to fetch dashboard data");
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return null;
  }
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

const formatSignedCurrency = (value: number) => {
  const formatted = formatCurrency(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `−${formatted}`;
  return formatted;
};

const formatPercent = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 2,
    signDisplay: "exceptZero",
  }).format(value / 100);

const Dashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { isSignedIn } = useUser();

  useEffect(() => {
    const loadData = async () => {
      const token = localStorage.getItem("alpaca_access_token");
      if (!token) {
        setLoading(false);
        setData(null);
        return;
      }
      const dashboardData = await fetchDashboardData(token);
      setData(dashboardData);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <CircularProgress />
      </div>
    );
  }

  if (!data || !isSignedIn) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">No data yet</h2>
        <p className="mt-3 text-muted-foreground">
          Place your first trade to populate the dashboard.
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
    );
  }

  const positions = data.positions.filter((p) => p.unrealized_pl > -0.02);
  const totalUnrealized = positions.reduce((sum, p) => sum + p.unrealized_pl, 0);
  const totalMarketValue = positions.reduce((sum, p) => sum + p.market_value, 0);
  const totalUnrealizedPct = totalMarketValue
    ? (totalUnrealized / totalMarketValue) * 100
    : 0;
  const orders = data.orders ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-12 px-2 py-6 md:px-4 md:py-10">
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
            label="Unrealized P&L"
            value={formatSignedCurrency(totalUnrealized)}
            sub={formatPercent(totalUnrealizedPct)}
            tone={totalUnrealized >= 0 ? "positive" : "negative"}
            className="border-r border-border/60"
          />
          <Kpi
            label="Open positions"
            value={positions.length.toString()}
            sub={`${positions.length === 1 ? "asset" : "assets"} held`}
          />
        </div>
      </section>

      {/* Open positions */}
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            Open positions
          </h2>
          <span className="font-mono text-xs text-muted-foreground">
            {positions.length}{" "}
            {positions.length === 1 ? "position" : "positions"}
          </span>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {positions.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    No open positions yet.
                  </td>
                </tr>
              ) : (
                positions.map((p) => {
                  const pct = p.market_value
                    ? (p.unrealized_pl / p.market_value) * 100
                    : 0;
                  const positive = p.unrealized_pl >= 0;
                  return (
                    <tr
                      key={p.symbol}
                      className="transition-colors duration-150 hover:bg-muted/30"
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
                        {formatSignedCurrency(p.unrealized_pl)}
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
          <table className="w-full table-auto">
            <thead className="bg-muted/30">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Symbol</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 text-right font-medium">Qty</th>
                <th className="hidden px-4 py-3 text-right font-medium md:table-cell">
                  Filled
                </th>
                <th className="px-4 py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    No open orders.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr
                    key={o.id}
                    className="transition-colors duration-150 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium">{o.symbol}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full border border-border/60 bg-background px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Buy
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {o.qty}
                    </td>
                    <td className="hidden px-4 py-3 text-right font-mono tabular-nums md:table-cell">
                      {o.filled_qty}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

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

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  let cls =
    "bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground";
  if (s === "filled" || s === "closed") {
    cls =
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
  } else if (s === "canceled" || s === "rejected" || s === "expired") {
    cls = "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
  } else if (s === "new" || s === "accepted" || s === "pending_new") {
    cls = "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        cls
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default Dashboard;
