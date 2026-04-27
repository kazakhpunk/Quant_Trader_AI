import { ContentLayout } from "@/components/admin-panel/content-layout";
import { PairTable } from "@/components/v4/rv-trade/pair-table";
import { Card, CardContent } from "@/components/ui/card";
import { PairsInfoDialog } from "@/components/v4/rv-trade/info-dialogs";

async function fetchPairs() {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  const res = await fetch(`${base}/api/v4/rv/pairs`, { cache: "no-store" });
  if (!res.ok) return { pairs: [], config: null };
  return res.json();
}

export default async function RvPairsPage() {
  const { pairs, config } = await fetchPairs();
  const active = pairs.filter((p: any) => p.status === "active").length;
  const rejected = pairs.length - active;

  return (
    <ContentLayout title="RV Trade — Pairs">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            §PAIRS · pipeline output
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            {active} active · {rejected} rejected.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Same-category pairs run through Engle-Granger cointegration → Pearson correlation
            on first differences → OU half-life. Only same-category candidates are evaluated.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          {config && (
            <div className="grid grid-cols-3 gap-x-6 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              <div>coint p ≤ <span className="text-foreground tabular-nums">{config.cointPMax}</span></div>
              <div>corr ≥ <span className="text-foreground tabular-nums">{config.corrMin}</span></div>
              <div>half-life ≤ <span className="text-foreground tabular-nums">{config.halfLifeMax}d</span></div>
            </div>
          )}
          <PairsInfoDialog />
        </div>
      </div>
      <Card className="border-border/60">
        <CardContent className="p-0">
          <PairTable pairs={pairs} />
        </CardContent>
      </Card>
    </ContentLayout>
  );
}
