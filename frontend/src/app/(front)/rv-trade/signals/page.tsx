"use client";

import { useEffect, useState } from "react";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { SignalTable } from "@/components/v4/rv-trade/signal-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { rvApi, SignalDto } from "@/lib/api/rv";
import { Loader } from "@/components/v4/loader";
import { RefreshCw } from "lucide-react";

export default function RvSignalsPage() {
  const [signals, setSignals] = useState<SignalDto[]>([]);
  const [asOf, setAsOf] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(refresh = false) {
    setLoading(true); setError(null);
    try {
      const data = refresh ? await rvApi.refreshSignals() : await rvApi.getSignals();
      setSignals(data.signals); setAsOf(data.asOf);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const tradeable = signals.filter((s) => s.status === "tradeable").length;

  return (
    <ContentLayout title="RV Trade — Signals">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            §SIGNALS · today&apos;s dislocations
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            {tradeable} tradeable · {signals.length - tradeable} regime-broken.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Active pairs scored by Kalman-residual z-score, 5-day momentum, and CUSUM regime check.
            {asOf && <span className="ml-1 font-mono text-xs uppercase tracking-wider">· as of {asOf}</span>}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(true)} disabled={loading} className="gap-2">
          <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0">
          {error && (
            <p className="border-b border-rose-500/30 bg-rose-500/5 px-4 py-2 text-sm text-rose-700 dark:text-rose-400">
              {error}
            </p>
          )}
          {loading && signals.length === 0
            ? <Loader height="320px" message="Computing signals…" />
            : <SignalTable signals={signals} />}
        </CardContent>
      </Card>
    </ContentLayout>
  );
}
