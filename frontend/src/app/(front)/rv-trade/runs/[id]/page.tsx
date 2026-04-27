"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EquityCurve } from "@/components/v4/rv-trade/equity-curve";
import { MetricsCard } from "@/components/v4/rv-trade/metrics-card";
import { TradeLogTable } from "@/components/v4/rv-trade/trade-log-table";
import { rvApi, BacktestRunDto } from "@/lib/api/rv";
import { Loader } from "@/components/v4/loader";

export default function RvRunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<BacktestRunDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    rvApi.getBacktest(id).then(r => setRun(r.run)).catch(e => setError((e as Error).message));
  }, [id]);

  if (error) return <ContentLayout title="Run"><p className="text-destructive">{error}</p></ContentLayout>;
  if (!run) return <ContentLayout title="Run"><Loader message="Loading run…" /></ContentLayout>;

  return (
    <ContentLayout title={`Run ${id.slice(0, 8)}`}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            §RUN · {id.slice(0, 8)}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            Backtest result.
          </h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {new Date(run.ts).toLocaleString()} · {run.userEmail}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <MetricsCard metrics={run.metrics} />
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Equity curve
            </CardTitle>
          </CardHeader>
          <CardContent><EquityCurve data={run.equityCurve} /></CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Trades
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0"><TradeLogTable trades={run.trades} /></CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto whitespace-pre font-mono text-xs text-muted-foreground">
            {JSON.stringify(run.config, null, 2)}
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
}
