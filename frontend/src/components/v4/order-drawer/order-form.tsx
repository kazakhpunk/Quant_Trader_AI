"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { fetchLatestPrice, PlaceOrderInput } from "@/lib/api/orders";
import { useUser } from "@clerk/nextjs";
import { RiskControls, RiskValues } from "./risk-controls";

export interface OrderFormValues extends Omit<PlaceOrderInput, "email"> {}

const PAPER_KEY = "qt_isLiveTrading";

export function OrderForm({
  symbol, onReview,
}: {
  symbol: string;
  onReview: (vals: OrderFormValues, refPrice: number | null) => void;
}) {
  const { user } = useUser();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [unit, setUnit] = useState<"shares" | "dollars">("dollars");
  const [qtyInput, setQtyInput] = useState("100");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [tif, setTif] = useState<"day" | "gtc">("day");
  const [isLive, setIsLive] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(PAPER_KEY) === "1";
  });
  const [risk, setRisk] = useState<RiskValues>({});
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem(PAPER_KEY, isLive ? "1" : "0");
  }, [isLive]);

  useEffect(() => {
    let alive = true;
    const email = user?.primaryEmailAddress?.emailAddress;
    if (!email) return;
    const tick = async () => {
      const p = await fetchLatestPrice(symbol, email, isLive);
      if (alive && p != null) setPrice(p);
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => { alive = false; clearInterval(id); };
  }, [symbol, isLive, user]);

  const numericInput = parseFloat(qtyInput) || 0;
  const resolvedQty = unit === "shares" ? numericInput : (price ? numericInput / price : 0);
  const resolvedNotional = unit === "dollars" ? numericInput : (price ? numericInput * price : 0);

  const submit = () => {
    onReview(
      {
        symbol, side, orderType, timeInForce: tif, isLiveTrading: isLive,
        ...(unit === "shares" ? { qty: numericInput } : { notional: numericInput }),
        ...(orderType === "limit" ? { limitPrice: parseFloat(limitPrice) } : {}),
        ...risk,
      },
      orderType === "limit" ? parseFloat(limitPrice) : price
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Live data</p>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-mono tabular-nums">
            {price != null ? `$${price.toFixed(2)}` : "—"}
          </span>
          <span className="text-xs text-muted-foreground">
            {isLive ? "Live" : "Paper"} · refreshes every 5s
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 overflow-hidden rounded-md border border-border/60">
        {(["buy", "sell"] as const).map((s) => (
          <button key={s} onClick={() => setSide(s)}
            className={`py-2 text-sm font-medium uppercase tracking-wide ${side === s ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {s}
          </button>
        ))}
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <Label htmlFor="qty">Quantity</Label>
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => setUnit(unit === "shares" ? "dollars" : "shares")}
          >
            in {unit} · switch to {unit === "shares" ? "dollars" : "shares"}
          </button>
        </div>
        <Input id="qty" type="number" min={0} step={0.01} value={qtyInput}
          onChange={(e) => setQtyInput(e.target.value)} />
        {price != null && (
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">
            ≈ {resolvedQty.toFixed(4)} shares · ${resolvedNotional.toFixed(2)}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 overflow-hidden rounded-md border border-border/60">
        {(["market", "limit"] as const).map((t) => (
          <button key={t} onClick={() => setOrderType(t)}
            className={`py-2 text-sm font-medium uppercase tracking-wide ${orderType === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {t}
          </button>
        ))}
      </div>
      {orderType === "limit" && (
        <div>
          <Label htmlFor="lp">Limit price</Label>
          <Input id="lp" type="number" min={0} step={0.01} value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)} />
        </div>
      )}

      <div className="grid grid-cols-2 overflow-hidden rounded-md border border-border/60">
        {(["day", "gtc"] as const).map((t) => (
          <button key={t} onClick={() => setTif(t)}
            className={`py-2 text-sm font-medium uppercase tracking-wide ${tif === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border/40 pt-4">
        <Label>Live trading</Label>
        <Switch checked={isLive} onCheckedChange={setIsLive} />
      </div>

      <RiskControls value={risk} onChange={setRisk} referencePrice={price} />

      <Button className="h-12 w-full" disabled={!numericInput || (orderType === "limit" && !limitPrice)}
        onClick={submit}>
        Review {side} {symbol}
        {price != null && unit === "shares" && ` · ~$${(numericInput * price).toFixed(2)}`}
        {price != null && unit === "dollars" && ` · ~${(numericInput / price).toFixed(2)} sh`}
      </Button>
    </div>
  );
}
