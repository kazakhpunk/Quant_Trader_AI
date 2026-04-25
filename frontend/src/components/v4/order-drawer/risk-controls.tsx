"use client";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown } from "lucide-react";

export interface RiskValues { stopLossPct?: number; takeProfitPct?: number; }

export function RiskControls({
  value, onChange, referencePrice,
}: {
  value: RiskValues;
  onChange: (v: RiskValues) => void;
  referencePrice: number | null;
}) {
  const [open, setOpen] = useState(false);
  const stop = value.stopLossPct;
  const tp = value.takeProfitPct;
  const stopPrice = referencePrice && stop ? referencePrice * (1 - stop / 100) : null;
  const tpPrice = referencePrice && tp ? referencePrice * (1 + tp / 100) : null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-t border-border/40 pt-4">
      <CollapsibleTrigger className="flex w-full items-center justify-between text-sm text-muted-foreground hover:text-foreground">
        <span>Risk controls (optional)</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="stop">Stop-loss %</Label>
            <Input id="stop" type="number" min={0} step={0.1}
              value={stop ?? ""}
              onChange={(e) => onChange({ ...value, stopLossPct: e.target.value ? +e.target.value : undefined })}
            />
          </div>
          <div>
            <Label htmlFor="tp">Take-profit %</Label>
            <Input id="tp" type="number" min={0} step={0.1}
              value={tp ?? ""}
              onChange={(e) => onChange({ ...value, takeProfitPct: e.target.value ? +e.target.value : undefined })}
            />
          </div>
        </div>
        {referencePrice != null && (stopPrice || tpPrice) && (
          <p className="text-xs text-muted-foreground">
            Filled at ${referencePrice.toFixed(2)}
            {stopPrice ? ` → stop $${stopPrice.toFixed(2)} (−${stop}%)` : ""}
            {tpPrice ? `, target $${tpPrice.toFixed(2)} (+${tp}%)` : ""}
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
