"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { fetchLatestPrice, PlaceOrderInput } from "@/lib/api/orders";
import { useUser } from "@clerk/nextjs";
import { RiskControls, RiskValues } from "./risk-controls";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

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
  const isFractionalQty = Math.abs(resolvedQty - Math.round(resolvedQty)) > 1e-9;
  const blocksFractionalShort = side === "sell" && resolvedQty > 0 && isFractionalQty;

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
        {blocksFractionalShort && (
          <p className="mt-2 text-xs text-amber-600">
            Short orders must use whole shares. Switch to shares and enter a whole number.
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

      <div>
        <div className="mb-2 flex items-center gap-1.5">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">
            Time in force
          </Label>
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="What does Time in Force mean?"
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground/70 transition hover:bg-muted/50 hover:text-foreground"
                >
                  <Info className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                align="start"
                className="max-w-[18rem] bg-foreground p-0 text-background shadow-lg"
              >
                <div className="space-y-2 p-3 text-left">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-70">
                    Time in force
                  </p>
                  <div className="space-y-1.5 text-[11px] leading-relaxed">
                    <p>
                      <span className="font-mono font-semibold uppercase tracking-wider">
                        Day
                      </span>
                      <span className="opacity-80">
                        {" — auto-cancels at the next 4:00 PM ET close if not filled."}
                      </span>
                    </p>
                    <p>
                      <span className="font-mono font-semibold uppercase tracking-wider">
                        GTC
                      </span>
                      <span className="opacity-80">
                        {" — Good-Til-Canceled. Stays open across sessions until it fills, you cancel, or it ages out (Alpaca: 90 days)."}
                      </span>
                    </p>
                  </div>
                  <p className="border-t border-background/15 pt-1.5 font-mono text-[10px] uppercase tracking-wider opacity-60">
                    {"Use GTC for limit orders you're willing to wait on"}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="grid grid-cols-2 overflow-hidden rounded-md border border-border/60">
          {(["day", "gtc"] as const).map((t) => (
            <button key={t} onClick={() => setTif(t)}
              className={`py-2 text-sm font-medium uppercase tracking-wide ${tif === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border/40 pt-4">
        <Label>Live trading</Label>
        <Switch checked={isLive} onCheckedChange={setIsLive} />
      </div>

      <RiskControls value={risk} onChange={setRisk} referencePrice={price} />

      <Button className="h-12 w-full" disabled={!numericInput || blocksFractionalShort || (orderType === "limit" && !limitPrice)}
        onClick={submit}>
        Review {side} {symbol}
        {price != null && unit === "shares" && ` · ~$${(numericInput * price).toFixed(2)}`}
        {price != null && unit === "dollars" && ` · ~${(numericInput / price).toFixed(2)} sh`}
      </Button>
    </div>
  );
}
