"use client";

import { useEffect, useState } from "react";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { SignalTable } from "@/components/v4/rv-trade/signal-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { rvApi, SignalDto } from "@/lib/api/rv";

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

  return (
    <ContentLayout title="RV Trade — Signals">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Today&apos;s dislocations</CardTitle>
            {asOf && <p className="text-sm text-muted-foreground">as of {asOf}</p>}
          </div>
          <Button onClick={() => load(true)} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-destructive mb-3">{error}</p>}
          <SignalTable signals={signals} />
        </CardContent>
      </Card>
    </ContentLayout>
  );
}
