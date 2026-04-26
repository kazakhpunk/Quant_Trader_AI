"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EquityCurve } from "@/components/v4/rv-trade/equity-curve";
import { MetricsCard } from "@/components/v4/rv-trade/metrics-card";
import { TradeLogTable } from "@/components/v4/rv-trade/trade-log-table";
import { rvApi, BacktestRunDto } from "@/lib/api/rv";

export default function RvRunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<BacktestRunDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    rvApi.getBacktest(id).then(r => setRun(r.run)).catch(e => setError((e as Error).message));
  }, [id]);

  if (error) return <ContentLayout title="Run"><p className="text-destructive">{error}</p></ContentLayout>;
  if (!run) return <ContentLayout title="Run"><p>Loading...</p></ContentLayout>;

  return (
    <ContentLayout title={`Run ${id.slice(0, 8)}`}>
      <div className="space-y-6">
        <MetricsCard metrics={run.metrics} />
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="text-sm font-mono whitespace-pre overflow-x-auto">
            {JSON.stringify(run.config, null, 2)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Equity curve</CardTitle></CardHeader>
          <CardContent><EquityCurve data={run.equityCurve} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Trades</CardTitle></CardHeader>
          <CardContent><TradeLogTable trades={run.trades} /></CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
}
