"use client";

import { useState } from "react";
import Link from "next/link";
import { BacktestRunDto, rvApi } from "@/lib/api/rv";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";

export function RunsHistoryTable({
  runs,
  onDeleted,
  currentRunId,
  onClearCurrent,
}: {
  runs: BacktestRunDto[];
  onDeleted?: (id: string) => void;
  currentRunId?: string;
  onClearCurrent?: () => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (runs.length === 0) {
    return <p className="px-4 py-3 text-sm text-muted-foreground">No saved runs yet.</p>;
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this backtest run? This can't be undone.")) return;
    setPendingId(id);
    try {
      await rvApi.deleteBacktest(id);
      onDeleted?.(id);
      if (currentRunId === id) onClearCurrent?.();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Range</TableHead>
          <TableHead className="text-right">Entry z</TableHead>
          <TableHead className="text-right">Cost bps</TableHead>
          <TableHead className="text-right">Sharpe</TableHead>
          <TableHead className="text-right">Trades</TableHead>
          <TableHead className="w-32 text-right"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((r) => (
          <TableRow
            key={r._id}
            className={currentRunId === r._id ? "bg-muted/30" : undefined}
          >
            <TableCell className="font-mono text-xs tabular-nums">
              {r.ts.slice(0, 16).replace("T", " ")}
            </TableCell>
            <TableCell className="font-mono text-xs tabular-nums">
              {r.config.startDate} → {r.config.endDate}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {r.config.rules.entryZ.toFixed(1)}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {r.config.rules.costBpsRoundTrip}
            </TableCell>
            <TableCell className="text-right font-mono font-semibold tabular-nums">
              {r.metrics.sharpe.toFixed(2)}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {r.metrics.numTrades}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-3">
                <Link
                  className="text-xs uppercase tracking-wider text-primary hover:underline"
                  href={`/rv-trade/runs/${r._id}`}
                >
                  open
                </Link>
                <button
                  type="button"
                  onClick={() => r._id && handleDelete(r._id)}
                  disabled={pendingId === r._id}
                  aria-label="Delete run"
                  className="rounded p-1 text-muted-foreground transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
