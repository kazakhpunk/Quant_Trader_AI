"use client";

import { BacktestMetricsDto } from "@/lib/api/rv";
import { Card, CardContent } from "@/components/ui/card";

const fmt = {
  pct: (v: number) => `${(v * 100).toFixed(2)}%`,
  num: (v: number, d = 2) => v.toFixed(d),
};

export function MetricsCard({ metrics }: { metrics: BacktestMetricsDto }) {
  const items: { label: string; value: string }[] = [
    { label: "Total return",   value: fmt.pct(metrics.totalReturn) },
    { label: "Ann. return",    value: fmt.pct(metrics.annReturn) },
    { label: "Ann. vol",       value: fmt.pct(metrics.annVol) },
    { label: "Sharpe",         value: fmt.num(metrics.sharpe) },
    { label: "Deflated Sharpe",value: fmt.num(metrics.deflatedSharpe) },
    { label: "Sortino",        value: fmt.num(metrics.sortino) },
    { label: "Max drawdown",   value: fmt.pct(metrics.maxDrawdown) },
    { label: "Hit rate",       value: fmt.pct(metrics.hitRate) },
    { label: "Avg holding",    value: `${fmt.num(metrics.avgHoldingDays, 0)} d` },
    { label: "Trades",         value: String(metrics.numTrades) },
  ];
  return (
    <Card>
      <CardContent className="grid grid-cols-2 gap-4 p-4 md:grid-cols-5">
        {items.map(it => (
          <div key={it.label} className="space-y-0.5">
            <div className="text-xs text-muted-foreground">{it.label}</div>
            <div className="text-lg font-semibold">{it.value}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
