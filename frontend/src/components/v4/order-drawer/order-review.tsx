"use client";
import { Button } from "@/components/ui/button";
import { OrderFormValues } from "./order-form";

export function OrderReview({
  values, referencePrice, onConfirm, onBack, loading,
}: {
  values: OrderFormValues;
  referencePrice: number | null;
  onConfirm: () => void;
  onBack: () => void;
  loading: boolean;
}) {
  const stopAt = referencePrice && values.stopLossPct
    ? referencePrice * (1 - values.stopLossPct / 100) : null;
  const tpAt = referencePrice && values.takeProfitPct
    ? referencePrice * (1 + values.takeProfitPct / 100) : null;

  const Row = ({ k, v }: { k: string; v: string }) => (
    <div className="flex items-baseline justify-between border-t border-border/30 py-2 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono tabular-nums">{v}</span>
    </div>
  );

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Review order</p>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight">
        {values.side.toUpperCase()} {values.symbol}
      </h3>
      <div className="mt-4">
        {values.qty != null && <Row k="Shares" v={values.qty.toString()} />}
        {values.notional != null && <Row k="Notional" v={`$${values.notional.toFixed(2)}`} />}
        <Row k="Order type" v={values.orderType} />
        {values.orderType === "limit" && <Row k="Limit price" v={`$${values.limitPrice}`} />}
        <Row k="Time in force" v={values.timeInForce.toUpperCase()} />
        <Row k="Mode" v={values.isLiveTrading ? "Live" : "Paper"} />
        {stopAt && <Row k={`Stop-loss (−${values.stopLossPct}%)`} v={`$${stopAt.toFixed(2)}`} />}
        {tpAt && <Row k={`Take-profit (+${values.takeProfitPct}%)`} v={`$${tpAt.toFixed(2)}`} />}
      </div>
      <div className="mt-6 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onBack} disabled={loading}>
          Back
        </Button>
        <Button className="flex-1" onClick={onConfirm} disabled={loading}>
          {loading ? "Placing…" : "Confirm"}
        </Button>
      </div>
    </div>
  );
}
