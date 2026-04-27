"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export interface PositionLite {
  symbol: string;
  market_value: number;
}

const PALETTE = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  // extra slots for >5 positions, cycled
  "hsl(220 70% 50%)",
  "hsl(280 65% 55%)",
  "hsl(45 80% 55%)",
];

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export function PositionPie({ positions }: { positions: PositionLite[] }) {
  const { data, total, chartConfig } = useMemo(() => {
    const filtered = positions
      .map((p) => ({ symbol: p.symbol, value: Math.max(0, Number(p.market_value) || 0) }))
      .filter((p) => p.value > 0)
      .sort((a, b) => b.value - a.value);

    const sum = filtered.reduce((s, p) => s + p.value, 0);

    // Group tail (anything < 3% of total) into "Other" once we have >7 slices.
    let rows: { symbol: string; value: number }[] = filtered;
    if (filtered.length > 7) {
      const head = filtered.slice(0, 6);
      const tail = filtered.slice(6);
      const otherValue = tail.reduce((s, p) => s + p.value, 0);
      if (otherValue > 0) head.push({ symbol: "Other", value: otherValue });
      rows = head;
    }

    const cfg: ChartConfig = {};
    rows.forEach((r, i) => {
      cfg[r.symbol] = { label: r.symbol, color: PALETTE[i % PALETTE.length] };
    });

    return { data: rows, total: sum, chartConfig: cfg };
  }, [positions]);

  if (!data.length) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        No positions to break down.
      </div>
    );
  }

  return (
    <div>
      <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px] w-full">
        <ResponsiveContainer>
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(v, name) => {
                    const n = Number(v);
                    const pct = total ? (n / total) * 100 : 0;
                    return [`${fmt(n)} · ${pct.toFixed(1)}%`, ` ${name}`];
                  }}
                />
              }
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="symbol"
              innerRadius="55%"
              outerRadius="85%"
              strokeWidth={2}
              stroke="hsl(var(--background))"
              activeShape={(props: any) => (
                <Sector
                  {...props}
                  outerRadius={(props.outerRadius as number) + 4}
                />
              )}
              isAnimationActive={false}
            >
              {data.map((d, i) => (
                <Cell
                  key={d.symbol}
                  fill={PALETTE[i % PALETTE.length]}
                />
              ))}
            </Pie>
            {/* center label */}
            <text
              x="50%"
              y="48%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground"
              style={{ fontFamily: "var(--font-geist-mono, monospace)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", fill: "hsl(var(--muted-foreground))" }}
            >
              Total
            </text>
            <text
              x="50%"
              y="56%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground"
              style={{ fontFamily: "var(--font-geist-mono, monospace)", fontSize: 18, fontWeight: 600 }}
            >
              {fmt(total)}
            </text>
          </PieChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
