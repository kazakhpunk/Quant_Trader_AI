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
import { Loader } from "@/components/v4/loader";
import { BacktestInfoDialog } from "@/components/v4/rv-trade/info-dialogs";

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
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            §BACKTEST · simulate the rule set
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            Tune rules, run, compare.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Entry / exit / stop thresholds in z-score units. Round-trip costs in basis points.
            Equal-weight or inverse-vol sizing across active pairs.
          </p>
        </div>
        <BacktestInfoDialog />
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Configure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BacktestConfig value={config} onChange={setConfig} onRun={runBacktest} loading={loading} />
            {error && (
              <p className="mt-3 rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-sm text-rose-700 dark:text-rose-400">
                {error}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {loading && !run && (
            <Card className="border-border/60">
              <CardContent>
                <Loader height="320px" message="Running backtest…" />
              </CardContent>
            </Card>
          )}
          {run && <>
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
                  Trade log
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0"><TradeLogTable trades={run.trades} /></CardContent>
            </Card>
          </>}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0"><RunsHistoryTable runs={history} /></CardContent>
          </Card>
        </div>
      </div>
    </ContentLayout>
  );
}
