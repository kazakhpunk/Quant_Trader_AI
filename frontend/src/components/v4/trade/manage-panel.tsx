"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PositionRow,
  OpenOrderRow,
  listPositions,
  listOpenOrders,
  closePosition,
  cancelOrder,
  closeAllPositions,
  cancelAllOrders,
} from "@/lib/api/orders";

type Banner = { kind: "ok" | "err"; msg: string } | null;

const num = (v?: string) => (v == null ? null : parseFloat(v));
const fmtMoney = (v?: string) => {
  const n = num(v);
  return n == null || Number.isNaN(n) ? "—" : `$${n.toFixed(2)}`;
};
const fmtPct = (v?: string) => {
  const n = num(v);
  return n == null || Number.isNaN(n) ? "—" : `${(n * 100).toFixed(2)}%`;
};

export function ManagePanel({
  email,
  isLiveTrading,
}: {
  email: string;
  isLiveTrading: boolean;
}) {
  const [positions, setPositions] = useState<PositionRow[] | null>(null);
  const [orders, setOrders] = useState<OpenOrderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [banner, setBanner] = useState<Banner>(null);

  const refresh = useCallback(async () => {
    if (!email) return;
    setError(null);
    const [p, o] = await Promise.all([
      listPositions(email, isLiveTrading),
      listOpenOrders(email, isLiveTrading),
    ]);
    if (!p.ok || !o.ok) {
      setError(p.error || o.error || "Failed to load");
      return;
    }
    setPositions(p.positions ?? []);
    setOrders(o.orders ?? []);
  }, [email, isLiveTrading]);

  useEffect(() => { refresh(); }, [refresh]);

  const lock = (id: string) => setBusy((s) => new Set(s).add(id));
  const unlock = (id: string) =>
    setBusy((s) => { const n = new Set(s); n.delete(id); return n; });

  const handleClosePosition = async (symbol: string) => {
    if (!confirm(`Close ${symbol} at market?`)) return;
    lock(`pos:${symbol}`);
    const r = await closePosition(email, isLiveTrading, symbol);
    setBanner(r.ok
      ? { kind: "ok", msg: `Close order submitted for ${symbol}.` }
      : { kind: "err", msg: r.error || `Failed to close ${symbol}.` });
    unlock(`pos:${symbol}`);
    await refresh();
  };

  const handleCancelOrder = async (id: string, symbol: string) => {
    if (!confirm(`Cancel open order on ${symbol}?`)) return;
    lock(`ord:${id}`);
    const r = await cancelOrder(email, isLiveTrading, id);
    setBanner(r.ok
      ? { kind: "ok", msg: `Cancelled order for ${symbol}.` }
      : { kind: "err", msg: r.error || `Failed to cancel.` });
    unlock(`ord:${id}`);
    await refresh();
  };

  const handleCloseAll = async () => {
    if (!positions?.length) return;
    if (!confirm("Liquidate every open position at market? Also cancels their related orders.")) return;
    lock("all-pos");
    const r = await closeAllPositions(email, isLiveTrading);
    setBanner(r.ok
      ? { kind: "ok", msg: "Liquidation submitted for all positions." }
      : { kind: "err", msg: r.error || "Failed." });
    unlock("all-pos");
    await refresh();
  };

  const handleCancelAll = async () => {
    if (!orders?.length) return;
    if (!confirm("Cancel every open order?")) return;
    lock("all-ord");
    const r = await cancelAllOrders(email, isLiveTrading);
    setBanner(r.ok
      ? { kind: "ok", msg: "Cancellation submitted for all open orders." }
      : { kind: "err", msg: r.error || "Failed." });
    unlock("all-ord");
    await refresh();
  };

  return (
    <div className="mt-8 space-y-6 rounded-lg border border-border/60 bg-muted/10 p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">Manage</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={refresh}
            className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            Refresh
          </button>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {isLiveTrading ? "live" : "paper"}
          </p>
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-rose-300/40 bg-rose-50/40 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
          {error}
        </p>
      )}

      {banner && (
        <p className={cn(
          "rounded-md px-3 py-2 text-xs",
          banner.kind === "ok"
            ? "border border-emerald-300/40 bg-emerald-50/40 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
            : "border border-rose-300/40 bg-rose-50/40 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400"
        )}>
          {banner.msg}
        </p>
      )}

      {/* POSITIONS */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Open positions {positions ? `(${positions.length})` : ""}
          </h3>
          {positions && positions.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCloseAll}
              disabled={busy.has("all-pos")}
              className="text-xs text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/50"
            >
              {busy.has("all-pos") ? "Closing…" : "Close all"}
            </Button>
          )}
        </div>
        {positions == null ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : positions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No open positions.</p>
        ) : (
          <ul className="divide-y divide-border/60 rounded-md border border-border/60">
            {positions.map((p) => {
              const plPct = num(p.unrealized_plpc);
              const plClass =
                plPct == null ? "" : plPct >= 0 ? "text-emerald-600" : "text-rose-600";
              return (
                <li key={p.symbol} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium">{p.symbol}</span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {p.side}
                      </span>
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {parseFloat(p.qty).toFixed(2)} sh @ {fmtMoney(p.avg_entry_price)} →
                      {" "}{fmtMoney(p.current_price)}
                      {" · "}<span className={plClass}>{fmtMoney(p.unrealized_pl)} ({fmtPct(p.unrealized_plpc)})</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleClosePosition(p.symbol)}
                    disabled={busy.has(`pos:${p.symbol}`)}
                    className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/50"
                  >
                    {busy.has(`pos:${p.symbol}`) ? "Closing…" : "Close"}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* OPEN ORDERS */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Open orders {orders ? `(${orders.length})` : ""}
          </h3>
          {orders && orders.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelAll}
              disabled={busy.has("all-ord")}
              className="text-xs"
            >
              {busy.has("all-ord") ? "Cancelling…" : "Cancel all"}
            </Button>
          )}
        </div>
        {orders == null ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="text-xs text-muted-foreground">No open orders.</p>
        ) : (
          <ul className="divide-y divide-border/60 rounded-md border border-border/60">
            {orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium">{o.symbol}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {o.side} · {o.type} · {o.time_in_force}
                    </span>
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {o.qty ? `${parseFloat(o.qty).toFixed(2)} sh` : `$${o.notional}`} · {o.status}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCancelOrder(o.id, o.symbol)}
                  disabled={busy.has(`ord:${o.id}`)}
                >
                  {busy.has(`ord:${o.id}`) ? "Cancelling…" : "Cancel"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
