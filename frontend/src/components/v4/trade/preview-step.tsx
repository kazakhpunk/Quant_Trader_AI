"use client";
import { Button } from "@/components/ui/button";
import { EnginePreview } from "@/lib/api/engine";

export function PreviewStep({
  preview, stopPct, tpPct, onAdjust, onPlace, loading,
}: {
  preview: EnginePreview;
  stopPct: number;
  tpPct: number;
  onAdjust: () => void;
  onPlace: () => void;
  loading: boolean;
}) {
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
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No tickers passed your filters. Try widening direction or disabling Skip held.
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

      <div className="mt-8 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onAdjust} disabled={loading}>Adjust</Button>
        <Button className="flex-1" onClick={onPlace} disabled={loading || preview.rows.length === 0}>
          {loading ? "Placing…" : `Place ${preview.rows.length} orders`}
        </Button>
      </div>
    </div>
  );
}
