"use client";

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

const chartConfig = {
  nav: {
    label: "NAV",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function EquityCurve({ data }: { data: { date: string; nav: number }[] }) {
  if (!data?.length) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
        No equity data
      </div>
    );
  }

  const start = data[0].nav;

  return (
    <ChartContainer config={chartConfig} className="h-[320px] w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 12 }}>
          <defs>
            <linearGradient id="navFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.35} />
              <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            minTickGap={48}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fontFamily: "var(--font-geist-mono, monospace)" }}
            tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: "short", year: "2-digit" })}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fontFamily: "var(--font-geist-mono, monospace)" }}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            domain={["auto", "auto"]}
            width={56}
          />
          <ReferenceLine
            y={start}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="2 4"
            strokeOpacity={0.6}
          />
          <ChartTooltip
            cursor={{ stroke: "hsl(var(--muted-foreground))", strokeOpacity: 0.3 }}
            content={
              <ChartTooltipContent
                labelFormatter={(d) => new Date(d as string).toLocaleDateString(undefined, {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
                formatter={(v) => [`$${Number(v).toLocaleString()}`, "NAV"]}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="nav"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            fill="url(#navFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
