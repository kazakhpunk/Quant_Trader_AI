"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { EngineExecuteResult } from "@/lib/api/engine";
import { closeAllPositions, cancelAllOrders } from "@/lib/api/orders";
import { cn } from "@/lib/utils";

type ManageState = { kind: "idle" } | { kind: "loading" } | { kind: "ok"; msg: string } | { kind: "err"; msg: string };

export function ResultStep({
  result, email, isLiveTrading, onAnother,
}: {
  result: EngineExecuteResult;
  email: string;
  isLiveTrading: boolean;
  onAnother: () => void;
}) {
  const [closeState, setCloseState] = useState<ManageState>({ kind: "idle" });
  const [cancelState, setCancelState] = useState<ManageState>({ kind: "idle" });

  const handleClose = async () => {
    if (!email) return;
    if (!confirm("Liquidate all open positions at market? This also cancels their related orders.")) return;
    setCloseState({ kind: "loading" });
    const r = await closeAllPositions(email, isLiveTrading);
    setCloseState(
      r.ok
        ? { kind: "ok", msg: `Liquidation submitted (${Array.isArray(r.closed) ? r.closed.length : "?"} positions).` }
        : { kind: "err", msg: r.error || "Failed to close positions." }
    );
  };

  const handleCancel = async () => {
    if (!email) return;
    if (!confirm("Cancel all open orders?")) return;
    setCancelState({ kind: "loading" });
    const r = await cancelAllOrders(email, isLiveTrading);
    setCancelState(
      r.ok
        ? { kind: "ok", msg: `Cancellation submitted (${Array.isArray(r.cancelled) ? r.cancelled.length : "?"} orders).` }
        : { kind: "err", msg: r.error || "Failed to cancel orders." }
    );
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 md:py-16">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Result</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Orders submitted</h1>
      <ul className="mt-8 divide-y divide-border/60 rounded-lg border border-border/60">
        {result.results.map((r, i) => (
          <li key={i} className="flex items-start justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <div className="font-medium">{r.ticker}</div>
              <div className="font-mono text-xs text-muted-foreground">{r.orderId ?? "—"}</div>
              {r.note && (
                <div className="mt-1 text-xs text-amber-700 dark:text-amber-400">{r.note}</div>
              )}
            </div>
            <span className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs",
              r.ok ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
            )}>
              {r.ok ? r.status ?? "submitted" : (r.error ?? "failed")}
            </span>
          </li>
        ))}
      </ul>

      {/* Manage panel */}
      <div className="mt-8 space-y-3 rounded-lg border border-border/60 bg-muted/10 p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium">Manage open positions</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {isLiveTrading ? "live" : "paper"}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Close every position you currently hold, or cancel every open (unfilled) order. Both actions are immediate and irreversible.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={closeState.kind === "loading"}
            className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/50"
          >
            {closeState.kind === "loading" ? "Closing…" : "Close all positions"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={cancelState.kind === "loading"}
          >
            {cancelState.kind === "loading" ? "Cancelling…" : "Cancel all open orders"}
          </Button>
        </div>
        {(closeState.kind === "ok" || closeState.kind === "err") && (
          <p className={cn("text-xs", closeState.kind === "ok" ? "text-emerald-600" : "text-rose-600")}>
            {closeState.msg}
          </p>
        )}
        {(cancelState.kind === "ok" || cancelState.kind === "err") && (
          <p className={cn("text-xs", cancelState.kind === "ok" ? "text-emerald-600" : "text-rose-600")}>
            {cancelState.msg}
          </p>
        )}
      </div>

      <div className="mt-8 flex gap-3">
        <Link href="/dashboard" className="flex-1">
          <Button variant="outline" className="w-full">View on dashboard</Button>
        </Link>
        <Button className="flex-1" onClick={onAnother}>Make another allocation</Button>
      </div>
    </div>
  );
}
