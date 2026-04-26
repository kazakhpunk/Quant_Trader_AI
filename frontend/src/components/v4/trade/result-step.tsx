"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { EngineExecuteResult } from "@/lib/api/engine";
import { cn } from "@/lib/utils";

export function ResultStep({ result, onAnother }: {
  result: EngineExecuteResult; onAnother: () => void;
}) {
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
      <div className="mt-8 flex gap-3">
        <Link href="/dashboard" className="flex-1">
          <Button variant="outline" className="w-full">View on dashboard</Button>
        </Link>
        <Button className="flex-1" onClick={onAnother}>Make another allocation</Button>
      </div>
    </div>
  );
}
