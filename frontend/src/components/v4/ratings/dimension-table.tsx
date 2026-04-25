"use client";
import { useState } from "react";
import { RatingRow, Dimension } from "@/lib/api/ratings";
import { useOrderDrawer } from "@/lib/order-drawer-store";
import { cn } from "@/lib/utils";

type Col<T> = { key: string; label: string; get: (r: RatingRow) => T; format?: (v: T) => string };

const scoreClass = (n: number) =>
  n >= 75 ? "text-emerald-600" : n >= 50 ? "text-amber-600" : "text-rose-600";

const dash = (v: any, fmt?: (x: any) => string) =>
  v == null || Number.isNaN(v) ? "—" : (fmt ? fmt(v) : String(v));

export const DIMENSION_COLUMNS: Record<Dimension, Col<any>[]> = {
  technical: [
    { key: "rsi",   label: "RSI",   get: (r) => r.metrics.technical?.rsi,   format: (v) => v.toFixed(1) },
    { key: "macd",  label: "MACD",  get: (r) => r.metrics.technical?.macd,  format: (v) => v.toFixed(2) },
    { key: "ma50",  label: "MA50",  get: (r) => r.metrics.technical?.ma50,  format: (v) => v.toFixed(2) },
    { key: "ma200", label: "MA200", get: (r) => r.metrics.technical?.ma200, format: (v) => v.toFixed(2) },
  ],
  fundamental: [
    { key: "pe",           label: "P/E",        get: (r) => r.metrics.fundamental?.pe,           format: (v) => v.toFixed(1) },
    { key: "epsGrowth",    label: "EPS growth", get: (r) => r.metrics.fundamental?.epsGrowth,    format: (v) => `${(v * 100).toFixed(1)}%` },
    { key: "profitMargin", label: "Margin",     get: (r) => r.metrics.fundamental?.profitMargin, format: (v) => `${(v * 100).toFixed(1)}%` },
  ],
  sentiment: [
    { key: "newsCount", label: "News count", get: (r) => r.metrics.sentiment?.newsCount },
    { key: "avgScore",  label: "Avg score",  get: (r) => r.metrics.sentiment?.avgScore, format: (v) => v.toFixed(2) },
  ],
  price: [
    { key: "d1Pct",  label: "1d %",  get: (r) => r.metrics.price?.d1Pct,  format: (v) => `${v.toFixed(2)}%` },
    { key: "d5Pct",  label: "5d %",  get: (r) => r.metrics.price?.d5Pct,  format: (v) => `${v.toFixed(2)}%` },
    { key: "d30Pct", label: "30d %", get: (r) => r.metrics.price?.d30Pct, format: (v) => `${v.toFixed(2)}%` },
  ],
  volatility: [
    { key: "sigma30d", label: "30d σ", get: (r) => r.metrics.volatility?.sigma30d, format: (v) => v.toFixed(3) },
    { key: "atr",      label: "ATR",   get: (r) => r.metrics.volatility?.atr,      format: (v) => v.toFixed(2) },
    { key: "beta",     label: "Beta",  get: (r) => r.metrics.volatility?.beta,     format: (v) => v.toFixed(2) },
  ],
};

export function DimensionTable({ dimension, rows }: { dimension: Dimension; rows: RatingRow[] }) {
  const open = useOrderDrawer((s) => s.open);
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
    <section id={dimension} className="space-y-4">
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
              <tr key={r.ticker} className="cursor-pointer transition-colors hover:bg-muted/30"
                onClick={() => open(r.ticker)}>
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
