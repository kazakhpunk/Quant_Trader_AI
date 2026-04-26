"use client";

import { BacktestConfigDto } from "@/lib/api/rv";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export interface BacktestConfigProps {
  value: BacktestConfigDto;
  onChange: (v: BacktestConfigDto) => void;
  onRun: () => void;
  loading: boolean;
}

export function BacktestConfig({ value, onChange, onRun, loading }: BacktestConfigProps) {
  const r = value.rules;
  function setRule<K extends keyof typeof r>(k: K, val: typeof r[K]) {
    onChange({ ...value, rules: { ...r, [k]: val } });
  }
  return (
    <div className="space-y-5">
      <div>
        <Label>Entry |z| ({r.entryZ.toFixed(1)})</Label>
        <Slider min={1} max={4} step={0.1} value={[r.entryZ]} onValueChange={([v]) => setRule("entryZ", v)} />
      </div>
      <div>
        <Label>Exit |z| ({r.exitZ.toFixed(1)})</Label>
        <Slider min={0} max={1.5} step={0.1} value={[r.exitZ]} onValueChange={([v]) => setRule("exitZ", v)} />
      </div>
      <div>
        <Label>Stop |z| ({r.stopZ.toFixed(1)})</Label>
        <Slider min={2} max={6} step={0.1} value={[r.stopZ]} onValueChange={([v]) => setRule("stopZ", v)} />
      </div>
      <div>
        <Label>Max holding (days, {r.maxHoldingDays})</Label>
        <Slider min={5} max={120} step={5} value={[r.maxHoldingDays]} onValueChange={([v]) => setRule("maxHoldingDays", v)} />
      </div>
      <div>
        <Label>Round-trip cost (bps, {r.costBpsRoundTrip})</Label>
        <Slider min={0} max={100} step={5} value={[r.costBpsRoundTrip]} onValueChange={([v]) => setRule("costBpsRoundTrip", v)} />
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={r.sizing === "inverseVol"} onCheckedChange={(c) => setRule("sizing", c ? "inverseVol" : "equalWeight")} />
        <Label>Sizing: {r.sizing}</Label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Start</Label>
          <Input type="date" value={value.startDate} onChange={(e) => onChange({ ...value, startDate: e.target.value })} />
        </div>
        <div>
          <Label>End</Label>
          <Input type="date" value={value.endDate} onChange={(e) => onChange({ ...value, endDate: e.target.value })} />
        </div>
      </div>
      <div>
        <Label>Notional ($)</Label>
        <Input type="number" value={value.notional} onChange={(e) => onChange({ ...value, notional: Number(e.target.value) })} />
      </div>
      <Button className="w-full" onClick={onRun} disabled={loading}>
        {loading ? "Running..." : "Run backtest"}
      </Button>
    </div>
  );
}
