"use client";
import { useState } from "react";
import { RatingRow, Dimension } from "@/lib/api/ratings";
import { useOrderDrawer } from "@/lib/order-drawer-store";
import { cn } from "@/lib/utils";
import { useRatingsHighlight } from "./use-ratings-highlight";

type Col<T> = { key: string; label: string; get: (r: RatingRow) => T; format?: (v: T) => string };

const scoreClass = (n: number) =>
  n >= 75 ? "text-emerald-600" : n >= 50 ? "text-amber-600" : "text-rose-600";

const dash = (v: any, fmt?: (x: any) => string) =>
  v == null || Number.isNaN(v) ? "—" : (fmt ? fmt(v) : String(v));

export const DIMENSION_COLUMNS: Record<Dimension, Col<any>[]> = {
  technical: [
    { key: "rsi",   label: "RSI",   get: (r) => r.metrics.technical?.rsi,   format: (v) => v.toFixed(1) },
    { key: "sma20", label: "SMA20", get: (r) => r.metrics.technical?.sma20, format: (v) => v.toFixed(2) },
    { key: "sma50", label: "SMA50", get: (r) => r.metrics.technical?.sma50, format: (v) => v.toFixed(2) },
    { key: "ema20", label: "EMA20", get: (r) => r.metrics.technical?.ema20, format: (v) => v.toFixed(2) },
    { key: "ema50", label: "EMA50", get: (r) => r.metrics.technical?.ema50, format: (v) => v.toFixed(2) },
  ],
  fundamental: [
    { key: "pe",            label: "P/E",       get: (r) => r.metrics.fundamental?.pe,            format: (v) => v.toFixed(1) },
    { key: "pegRatio",      label: "PEG",       get: (r) => r.metrics.fundamental?.pegRatio,      format: (v) => v.toFixed(2) },
    { key: "profitMargin",  label: "Margin",    get: (r) => r.metrics.fundamental?.profitMargin,  format: (v) => `${(v * 100).toFixed(1)}%` },
    { key: "dividendYield", label: "Div yield", get: (r) => r.metrics.fundamental?.dividendYield, format: (v) => `${(v * 100).toFixed(2)}%` },
    { key: "payoutRatio",   label: "Payout",    get: (r) => r.metrics.fundamental?.payoutRatio,   format: (v) => `${(v * 100).toFixed(0)}%` },
  ],
  sentiment: [
    { key: "score",     label: "Sentiment", get: (r) => r.metrics.sentiment?.score,     format: (v) => v.toFixed(2) },
    { key: "newsCount", label: "Articles",  get: (r) => r.metrics.sentiment?.newsCount, format: (v) => String(v) },
  ],
  price: [
    { key: "d1Pct",  label: "1d %",  get: (r) => r.metrics.price?.d1Pct,  format: (v) => `${v.toFixed(2)}%` },
    { key: "d5Pct",  label: "5d %",  get: (r) => r.metrics.price?.d5Pct,  format: (v) => `${v.toFixed(2)}%` },
    { key: "d30Pct", label: "30d %", get: (r) => r.metrics.price?.d30Pct, format: (v) => `${v.toFixed(2)}%` },
  ],
  volatility: [
    { key: "sigma30d", label: "30d σ (ann.)", get: (r) => r.metrics.volatility?.sigma30d, format: (v) => `${v.toFixed(1)}%` },
    { key: "atr",      label: "ATR-14",       get: (r) => r.metrics.volatility?.atr,      format: (v) => v.toFixed(2) },
  ],
};

export function DimensionTable({ dimension, rows }: { dimension: Dimension; rows: RatingRow[] }) {
  const open = useOrderDrawer((s) => s.open);
  const pulseTicker = useRatingsHighlight(dimension);
  const [sort, setSort] = useState<{ k: string; dir: "asc" | "desc" }>({
    k: "score", dir: "desc",
  });
  const cols = DIMENSION_COLUMNS[dimension];

  const sorted = [...rows].sort((a, b) => {
    let av: any, bv: any;
    if (sort.k === "ticker") { av = a.ticker; bv = b.ticker; }
    else if (sort.k === "score") { av = a.scores[dimension]; bv = b.scores[dimension]; }
    else {
      const c = cols.find((c) => c.key === sort.k)!;
      av = c.get(a); bv = c.get(b);
      if (av == null) av = -Infinity;
      if (bv == null) bv = -Infinity;
    }
    if (av < bv) return sort.dir === "asc" ? -1 : 1;
    if (av > bv) return sort.dir === "asc" ? 1 : -1;
    return 0;
  });

  const Th = ({ k, label, right }: { k: string; label: string; right?: boolean }) => (
    <th className={cn("px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium", right && "text-right")}>
      <button onClick={() => setSort({ k, dir: sort.k === k && sort.dir === "desc" ? "asc" : "desc" })}>
        {label} {sort.k === k ? (sort.dir === "desc" ? "↓" : "↑") : ""}
      </button>
    </th>
  );

  return (
    <section id={dimension} className="scroll-mt-20 space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold capitalize tracking-tight">{dimension}</h2>
      </div>
      <div className="overflow-hidden rounded-lg border border-border/60">
        <table className="w-full table-auto">
          <thead className="bg-muted/30">
            <tr className="text-left">
              <Th k="ticker" label="Ticker" />
              <Th k="score" label="Score" right />
              {cols.map((c) => <Th key={c.key} k={c.key} label={c.label} right />)}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {sorted.map((r) => (
              <tr
                key={r.ticker}
                id={`row-${dimension}-${r.ticker}`}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-muted/30",
                  pulseTicker === r.ticker && "ratings-row-pulse",
                )}
                onClick={() => open(r.ticker)}
              >
                <td className="px-4 py-3 font-medium">{r.ticker}</td>
                <td className={cn("px-4 py-3 text-right font-mono tabular-nums", scoreClass(r.scores[dimension]))}>
                  {Math.round(r.scores[dimension])}
                </td>
                {cols.map((c) => (
                  <td key={c.key} className="px-4 py-3 text-right font-mono tabular-nums">
                    {dash(c.get(r), c.format)}
                  </td>
                ))}
                <td className="px-4 py-3 text-right text-muted-foreground">→</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
