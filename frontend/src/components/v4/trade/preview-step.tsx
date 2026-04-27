"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EnginePreview, EngineDiagnostics } from "@/lib/api/engine";
import { getApiUrl } from "@/lib/utils";

export function PreviewStep({
  preview, stopPct, tpPct, onAdjust, onPlace, onRetry, loading,
}: {
  preview: EnginePreview;
  stopPct: number;
  tpPct: number;
  onAdjust: () => void;
  onPlace: () => void;
  onRetry?: () => void;
  loading: boolean;
}) {
  const fractionalShortRows = preview.rows.filter(
    (r) => r.side === "sell" && Math.abs(r.qty - Math.round(r.qty)) > 1e-9,
  );
  const blocksFractionalShorts = fractionalShortRows.length > 0;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 md:py-16">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Preview</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Engine plan</h1>
      <p className="mt-3 text-muted-foreground">
        Review the orders the engine will place. Nothing is sent until you confirm.
      </p>

      <div className="mt-8 overflow-hidden rounded-lg border border-border/60">
        <table className="w-full table-auto">
          <thead className="bg-muted/30">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium">Ticker</th>
              <th className="px-4 py-3 font-medium">Side</th>
              <th className="px-4 py-3 text-right font-medium">Composite</th>
              <th className="px-4 py-3 font-medium">Why</th>
              <th className="px-4 py-3 text-right font-medium">Allocation</th>
              <th className="px-4 py-3 text-right font-medium">~Shares</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {preview.rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  <EmptyExplanation diag={preview.diagnostics} onRetry={onRetry} />
                </td>
              </tr>
            ) : preview.rows.map((r) => (
              <tr key={r.ticker}>
                <td className="px-4 py-3 font-medium">{r.ticker}</td>
                <td className="px-4 py-3 capitalize">{r.side}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">{r.composite || "—"}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{r.topSignals.join(" · ") || "—"}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">${r.allocation.toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">{r.qty.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 font-mono text-xs text-muted-foreground">
        Total: ${preview.totalAllocated.toFixed(2)} of ${preview.totalRequested.toFixed(2)} ·
        {" "}{preview.rows.length} positions ·
        {" "}Stop −{stopPct}% · Target +{tpPct}%
      </p>
      {preview.capBindingBuffer > 0 && (
        <p className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          ${preview.capBindingBuffer.toFixed(2)} held as cash because your{" "}
          <span className="font-mono">max position {preview.caps.maxPositionPct}%</span> cap
          limits {preview.rows.length} pick{preview.rows.length === 1 ? "" : "s"} to{" "}
          ${(preview.caps.maxPositionPct * preview.totalRequested / 100).toFixed(2)} each.
          Raise the cap in Adjust to deploy more.
        </p>
      )}
      {blocksFractionalShorts && (
        <p className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          Short orders require whole shares. Adjust allocation or direction before placing:{" "}
          {fractionalShortRows.map((r) => `${r.ticker} ${r.qty.toFixed(2)} sh`).join(", ")}.
        </p>
      )}

      <div className="mt-8 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onAdjust} disabled={loading}>Adjust</Button>
        <Button className="flex-1" onClick={onPlace} disabled={loading || preview.rows.length === 0 || blocksFractionalShorts}>
          {loading ? "Placing…" : `Place ${preview.rows.length} orders`}
        </Button>
      </div>
    </div>
  );
}

function EmptyExplanation({ diag, onRetry }: { diag: EngineDiagnostics; onRetry?: () => void }) {
  const { totalCandidates, afterDirection, afterSentiment, afterSkipHeld, afterCap } = diag;
  const [running, setRunning] = useState(false);
  const [runErr, setRunErr] = useState<string | null>(null);

  let headline = "No tickers passed your filters.";
  let hint = "Try widening direction or disabling Skip held.";

  if (totalCandidates === 0) {
    headline = "No engine candidates available yet.";
    hint = "The analysis pipeline hasn't produced any picks. Run analysis to scan the universe — this can take several minutes.";
  } else if (afterDirection === 0) {
    hint = "Your direction filter excluded everything. Try switching direction (long / short / both).";
  } else if (afterSentiment === 0) {
    hint = "All candidates were filtered out by the sentiment threshold. Disable Sentiment signals to include them.";
  } else if (afterSkipHeld === 0) {
    hint = "You already hold every candidate. Disable Skip held to allow adding to existing positions.";
  } else if (afterCap === 0) {
    hint = "Max positions cap is 0. Increase Max positions in Configure.";
  }

  const runAnalysis = async () => {
    setRunning(true); setRunErr(null);
    try {
      const res = await fetch(`${getApiUrl()}/api/v1/update`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onRetry?.();
    } catch (e: any) {
      setRunErr(e.message || "Failed to start analysis");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="font-medium text-foreground">{headline}</p>
      <p>{hint}</p>
      {totalCandidates === 0 && (
        <div className="flex justify-center pt-1">
          <Button variant="outline" size="sm" onClick={runAnalysis} disabled={running}>
            {running ? "Running analysis…" : "Run analysis now"}
          </Button>
        </div>
      )}
      {runErr && <p className="text-xs text-destructive">{runErr}</p>}
      <div className="mx-auto max-w-md text-left text-xs font-mono text-muted-foreground">
        <Row label="Candidates from analysis" v={totalCandidates} />
        <Row label="After direction filter" v={afterDirection} />
        <Row label="After sentiment filter" v={afterSentiment} />
        <Row label="After skip-held filter" v={afterSkipHeld} />
        <Row label="After max-positions cap" v={afterCap} />
      </div>
    </div>
  );
}

function Row({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex items-center justify-between border-b border-border/30 py-1">
      <span>{label}</span>
      <span className="tabular-nums">{v}</span>
    </div>
  );
}
