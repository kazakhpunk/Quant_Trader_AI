"use client";

import { BacktestConfigDto } from "@/lib/api/rv";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export interface BacktestConfigProps {
  value: BacktestConfigDto;
  onChange: (v: BacktestConfigDto) => void;
  onRun: () => void;
  loading: boolean;
}

function GroupHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
      {children}
    </div>
  );
}

function SliderRow({
  label,
  value,
  unit = "",
  format = (v: number) => v.toFixed(1),
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  unit?: string;
  format?: (v: number) => string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm">{label}</span>
        <span className="font-mono text-sm tabular-nums text-foreground">
          {format(value)}
          {unit && <span className="ml-0.5 text-muted-foreground">{unit}</span>}
        </span>
      </div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

export function BacktestConfig({ value, onChange, onRun, loading }: BacktestConfigProps) {
  const r = value.rules;
  function setRule<K extends keyof typeof r>(k: K, val: typeof r[K]) {
    onChange({ ...value, rules: { ...r, [k]: val } });
  }
  return (
    <div className="space-y-6">
      {/* RULES */}
      <section>
        <GroupHeader>Trading rules</GroupHeader>
        <div className="space-y-4">
          <SliderRow label="Entry |z|"  value={r.entryZ} min={1} max={4}   step={0.1} onChange={(v) => setRule("entryZ", v)} />
          <SliderRow label="Exit |z|"   value={r.exitZ}  min={0} max={1.5} step={0.1} onChange={(v) => setRule("exitZ", v)} />
          <SliderRow label="Stop |z|"   value={r.stopZ}  min={2} max={6}   step={0.1} onChange={(v) => setRule("stopZ", v)} />
        </div>
      </section>

      {/* RISK / COST */}
      <section>
        <GroupHeader>Risk &amp; cost</GroupHeader>
        <div className="space-y-4">
          <SliderRow label="Max holding"      value={r.maxHoldingDays}    min={5} max={120} step={5} unit=" d"  format={(v) => v.toFixed(0)} onChange={(v) => setRule("maxHoldingDays", v)} />
          <SliderRow label="Round-trip cost"  value={r.costBpsRoundTrip}  min={0} max={100} step={5} unit=" bps" format={(v) => v.toFixed(0)} onChange={(v) => setRule("costBpsRoundTrip", v)} />
          <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 px-3 py-2">
            <div>
              <div className="text-sm">Sizing</div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {r.sizing === "inverseVol" ? "inverse-vol" : "equal-weight"}
              </div>
            </div>
            <Switch
              checked={r.sizing === "inverseVol"}
              onCheckedChange={(c) => setRule("sizing", c ? "inverseVol" : "equalWeight")}
            />
          </div>
        </div>
      </section>

      {/* WINDOW + NOTIONAL */}
      <section>
        <GroupHeader>Window &amp; notional</GroupHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Start</div>
            <Input type="date" value={value.startDate} onChange={(e) => onChange({ ...value, startDate: e.target.value })} />
          </div>
          <div>
            <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">End</div>
            <Input type="date" value={value.endDate} onChange={(e) => onChange({ ...value, endDate: e.target.value })} />
          </div>
          <div className="col-span-2">
            <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Notional ($)</div>
            <Input
              type="number"
              value={value.notional}
              onChange={(e) => onChange({ ...value, notional: Number(e.target.value) })}
              className="font-mono tabular-nums"
            />
          </div>
        </div>
      </section>

      <Button className="w-full" onClick={onRun} disabled={loading}>
        {loading ? "Running…" : "Run backtest"}
      </Button>
    </div>
  );
}
