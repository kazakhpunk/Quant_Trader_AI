"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOrderDrawer } from "@/lib/order-drawer-store";

export function TradeButton() {
  const open = useOrderDrawer((s) => s.open);
  const [symbol, setSymbol] = useState("");
  return (
    <div className="my-4 flex items-center gap-2">
      <Input placeholder="Ticker (e.g. NVDA)" value={symbol}
        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
        className="w-40" />
      <Button onClick={() => symbol && open(symbol)} disabled={!symbol}>
        Trade
      </Button>
    </div>
  );
}
