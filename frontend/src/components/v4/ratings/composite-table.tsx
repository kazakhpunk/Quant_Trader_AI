"use client";
import { useState } from "react";
import { RatingRow, VISIBLE_DIMENSIONS, Dimension } from "@/lib/api/ratings";
import { useOrderDrawer } from "@/lib/order-drawer-store";
import { cn } from "@/lib/utils";

const scoreClass = (n: number) =>
  n >= 75 ? "text-emerald-600" : n >= 50 ? "text-amber-600" : "text-rose-600";

type SortKey = "ticker" | "composite" | Dimension;

export function CompositeTable({ rows }: { rows: RatingRow[] }) {
  const open = useOrderDrawer((s) => s.open);
  const [sort, setSort] = useState<{ k: SortKey; dir: "asc" | "desc" }>({
    k: "composite", dir: "desc",
  });

  const sorted = [...rows].sort((a, b) => {
    const av = sort.k === "ticker" ? a.ticker
      : sort.k === "composite" ? a.composite
      : a.scores[sort.k as Dimension];
    const bv = sort.k === "ticker" ? b.ticker
      : sort.k === "composite" ? b.composite
      : b.scores[sort.k as Dimension];
    if (av < bv) return sort.dir === "asc" ? -1 : 1;
    if (av > bv) return sort.dir === "asc" ? 1 : -1;
    return 0;
  });

  const Th = ({ k, label, right }: { k: SortKey; label: string; right?: boolean }) => (
    <th className={cn("px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium",
      right && "text-right")}>
      <button onClick={() => setSort({ k, dir: sort.k === k && sort.dir === "desc" ? "asc" : "desc" })}>
        {label} {sort.k === k ? (sort.dir === "desc" ? "↓" : "↑") : ""}
      </button>
    </th>
  );

  return (
    <div id="composite" className="overflow-hidden rounded-lg border border-border/60">
      <table className="w-full table-auto">
        <thead className="bg-muted/30">
          <tr className="text-left">
            <Th k="ticker" label="Ticker" />
            <Th k="composite" label="Composite" right />
            {VISIBLE_DIMENSIONS.map((d) => (
              <Th key={d} k={d} label={d.slice(0, 4)} right />
            ))}
            <th className="w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {sorted.map((r) => (
            <tr key={r.ticker}
              className="cursor-pointer transition-colors hover:bg-muted/30"
              onClick={() => open(r.ticker)}>
              <td className="px-4 py-3 font-medium">{r.ticker}</td>
              <td className={cn("px-4 py-3 text-right font-mono tabular-nums", scoreClass(r.composite))}>
                {r.composite}
              </td>
              {VISIBLE_DIMENSIONS.map((d) => (
                <td key={d} className={cn("px-4 py-3 text-right font-mono tabular-nums", scoreClass(r.scores[d]))}>
                  {Math.round(r.scores[d])}
                </td>
              ))}
              <td className="px-4 py-3 text-right text-muted-foreground">→</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
