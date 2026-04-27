"use client";

import { BacktestMetricsDto } from "@/lib/api/rv";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const fmt = {
  pct: (v: number) => `${(v * 100).toFixed(2)}%`,
  num: (v: number, d = 2) => v.toFixed(d),
};

const signClass = (v: number) =>
  v > 0 ? "text-emerald-600 dark:text-emerald-400"
       : v < 0 ? "text-rose-600 dark:text-rose-400"
       : "text-foreground";

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className={cn("font-mono text-base font-semibold tabular-nums", className)}>
        {value}
      </div>
    </div>
  );
}

export function MetricsCard({ metrics }: { metrics: BacktestMetricsDto }) {
  return (
    <Card className="overflow-hidden border-border/60">
      {/* Hero strip — three headline numbers */}
      <div className="grid grid-cols-3 divide-x divide-border/60 border-b border-border/60 bg-muted/20">
        <Hero
          label="Total return"
          value={fmt.pct(metrics.totalReturn)}
          colorClass={signClass(metrics.totalReturn)}
        />
        <Hero
          label="Sharpe"
          value={fmt.num(metrics.sharpe)}
          colorClass={signClass(metrics.sharpe)}
        />
        <Hero
          label="Max drawdown"
          value={fmt.pct(metrics.maxDrawdown)}
          colorClass="text-rose-600 dark:text-rose-400"
        />
      </div>
      {/* Detail grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 p-5 sm:grid-cols-4 lg:grid-cols-7">
        <Stat label="Ann. return" value={fmt.pct(metrics.annReturn)} className={signClass(metrics.annReturn)} />
        <Stat label="Ann. vol" value={fmt.pct(metrics.annVol)} />
        <Stat label="Sortino" value={fmt.num(metrics.sortino)} className={signClass(metrics.sortino)} />
        <Stat label="Deflated SR" value={fmt.num(metrics.deflatedSharpe)} className={signClass(metrics.deflatedSharpe)} />
        <Stat label="Hit rate" value={fmt.pct(metrics.hitRate)} />
        <Stat label="Avg holding" value={`${fmt.num(metrics.avgHoldingDays, 0)}d`} />
        <Stat label="Trades" value={String(metrics.numTrades)} />
      </div>
    </Card>
  );
}

function Hero({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: string;
  colorClass: string;
}) {
  return (
    <div className="px-5 py-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </div>
      <div className={cn("mt-1 font-mono text-2xl font-semibold tabular-nums tracking-tight md:text-3xl", colorClass)}>
        {value}
      </div>
    </div>
  );
}
