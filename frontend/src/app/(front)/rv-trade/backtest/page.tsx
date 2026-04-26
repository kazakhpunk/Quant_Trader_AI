"use client";

import { useEffect, useState } from "react";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BacktestConfig } from "@/components/v4/rv-trade/backtest-config";
import { EquityCurve } from "@/components/v4/rv-trade/equity-curve";
import { MetricsCard } from "@/components/v4/rv-trade/metrics-card";
import { TradeLogTable } from "@/components/v4/rv-trade/trade-log-table";
import { RunsHistoryTable } from "@/components/v4/rv-trade/runs-history-table";
import { rvApi, BacktestConfigDto, BacktestRunDto } from "@/lib/api/rv";

const DEFAULT_CONFIG: BacktestConfigDto = {
  rules: { entryZ: 2.0, exitZ: 0.5, stopZ: 3.5, maxHoldingDays: 60, costBpsRoundTrip: 30, sizing: "equalWeight" },
  startDate: "2022-01-01",
  endDate: new Date().toISOString().slice(0, 10),
  notional: 1_000_000,
  dv01YearsProxy: 7,
};

export default function RvBacktestPage() {
  const [config, setConfig] = useState<BacktestConfigDto>(DEFAULT_CONFIG);
  const [run, setRun] = useState<BacktestRunDto | null>(null);
  const [history, setHistory] = useState<BacktestRunDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadHistory() {
    try { const r = await rvApi.listBacktests(); setHistory(r.runs); } catch {}
  }
  useEffect(() => { loadHistory(); }, []);

  async function runBacktest() {
    setLoading(true); setError(null);
    try {
      const out = await rvApi.runBacktest(config);
      setRun(out.run);
      loadHistory();
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <ContentLayout title="RV Trade — Backtest">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader><CardTitle>Configure</CardTitle></CardHeader>
          <CardContent>
            <BacktestConfig value={config} onChange={setConfig} onRun={runBacktest} loading={loading} />
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {run && <>
            <MetricsCard metrics={run.metrics} />
            <Card>
              <CardHeader><CardTitle>Equity curve</CardTitle></CardHeader>
              <CardContent><EquityCurve data={run.equityCurve} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Trade log</CardTitle></CardHeader>
              <CardContent><TradeLogTable trades={run.trades} /></CardContent>
            </Card>
          </>}
          <Card>
            <CardHeader><CardTitle>History</CardTitle></CardHeader>
            <CardContent><RunsHistoryTable runs={history} /></CardContent>
          </Card>
        </div>
      </div>
    </ContentLayout>
  );
}
