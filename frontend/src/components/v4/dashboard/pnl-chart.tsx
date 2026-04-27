"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Loader } from "@/components/v4/loader";
import { cn } from "@/lib/utils";

type Period = "1W" | "1M" | "3M" | "1A";
const PERIODS: Period[] = ["1W", "1M", "3M", "1A"];

const chartConfig = {
  pnl: { label: "Unrealized P&L", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

interface HistoryPayload {
  timestamp: number[];
  equity: number[];
  profit_loss: number[];
  profit_loss_pct: number[];
  base_value: number;
  timeframe: string;
}

const getApiUrl = () =>
  process.env.NODE_ENV === "development"
    ? "http://localhost:8000"
    : "https://quanttraderai-production.up.railway.app";

async function fetchHistory(
  token: string,
  period: Period
): Promise<HistoryPayload | null> {
  try {
    const r = await fetch(`${getApiUrl()}/api/v4/portfolio-history`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ period, isLive: false }),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

const fmt = {
  money: (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n),
};

export function PnlChart() {
  const [period, setPeriod] = useState<Period>("1M");
  const [data, setData] = useState<HistoryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("alpaca_access_token");
    if (!token) {
      setLoading(false);
      setError("No brokerage connected.");
      return;
    }
    fetchHistory(token, period)
      .then((d) => {
        if (!d) setError("Failed to load portfolio history.");
        setData(d);
      })
      .finally(() => setLoading(false));
  }, [period]);

  const series = useMemo(() => {
    if (!data?.timestamp?.length) return [];
    return data.timestamp.map((t, i) => ({
      ts: t * 1000,
      pnl: data.profit_loss[i] ?? 0,
      equity: data.equity[i] ?? 0,
    }));
  }, [data]);

  const finalPnl = series.length ? series[series.length - 1].pnl : 0;
  const periodPct = data?.profit_loss_pct?.length
    ? data.profit_loss_pct[data.profit_loss_pct.length - 1] * 100
    : 0;
  const positive = finalPnl >= 0;

  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 bg-muted/20 px-5 py-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Unrealized P&amp;L
          </p>
          <div className="mt-1 flex items-baseline gap-3">
            <span
              className={cn(
                "font-mono text-2xl font-semibold tabular-nums tracking-tight md:text-3xl",
                positive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              )}
            >
              {positive ? "+" : "−"}
              {fmt.money(Math.abs(finalPnl))}
            </span>
            <span
              className={cn(
                "font-mono text-xs tabular-nums",
                positive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              )}
            >
              {periodPct >= 0 ? "+" : ""}
              {periodPct.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="flex items-center rounded-md border border-border/70 bg-background p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider transition",
                period === p
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* body */}
      <div className="p-2 md:p-4">
        {loading ? (
          <Loader height="280px" message="Loading portfolio history…" />
        ) : error ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            {error}
          </div>
        ) : !series.length ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            No P&amp;L history yet.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <ResponsiveContainer>
              <AreaChart data={series} margin={{ top: 8, right: 12, bottom: 8, left: 12 }}>
                <defs>
                  <linearGradient id="pnlFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={positive ? "hsl(142 76% 36%)" : "hsl(346 87% 43%)"}
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="95%"
                      stopColor={positive ? "hsl(142 76% 36%)" : "hsl(346 87% 43%)"}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="ts"
                  type="number"
                  scale="time"
                  domain={["dataMin", "dataMax"]}
                  minTickGap={48}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fontFamily: "var(--font-geist-mono, monospace)" }}
                  tickFormatter={(v) =>
                    new Date(v).toLocaleDateString(undefined, {
                      month: "short",
                      day: period === "1W" ? "numeric" : undefined,
                      year: period === "1A" ? "2-digit" : undefined,
                    })
                  }
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fontFamily: "var(--font-geist-mono, monospace)" }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                  width={56}
                />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 4" strokeOpacity={0.6} />
                <ChartTooltip
                  cursor={{ stroke: "hsl(var(--muted-foreground))", strokeOpacity: 0.3 }}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => {
                        // The X axis is a Date-scaled number, but formatted ticks
                        // arrive here as strings — pull the raw `ts` off the
                        // payload instead.
                        const ts = (payload?.[0]?.payload as { ts?: number } | undefined)?.ts;
                        if (typeof ts !== "number" || !Number.isFinite(ts)) return "";
                        return new Date(ts).toLocaleString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          ...(period === "1W"
                            ? { hour: "2-digit", minute: "2-digit" }
                            : {}),
                        });
                      }}
                      formatter={(v) => [fmt.money(Number(v)), " P&L"]}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="pnl"
                  stroke={positive ? "hsl(142 76% 36%)" : "hsl(346 87% 43%)"}
                  strokeWidth={2}
                  fill="url(#pnlFill)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}
