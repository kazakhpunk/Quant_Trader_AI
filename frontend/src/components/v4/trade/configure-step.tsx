"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { EngineFormState, DEFAULT_CAPS } from "@/lib/api/engine";

const PRESETS = [25, 50, 75, 100];

export function ConfigureStep({
  state, onChange, onPreview, availableCash, loading,
}: {
  state: EngineFormState;
  onChange: (s: EngineFormState) => void;
  onPreview: () => void;
  availableCash: number | null;
  loading: boolean;
}) {
  const set = (patch: Partial<EngineFormState>) => onChange({ ...state, ...patch });
  const setCap = <K extends keyof typeof DEFAULT_CAPS>(k: K, v: number) =>
    set({ caps: { ...state.caps, [k]: v } });

  const dollars = Math.floor(state.amount);
  const cents = Math.round((state.amount - dollars) * 100).toString().padStart(2, "0");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 md:pb-12">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Allocate capital</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Purchase stocks</h1>
      <p className="mt-3 text-muted-foreground">
        Total capital to deploy across all picks. The engine splits it evenly, capped per
        position, and only fires names that pass your filters.
      </p>

      <div className="mt-12 border-y border-border/40 py-12">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">
          Allocation amount
        </p>
        <div className="mt-4 flex items-baseline justify-center gap-1">
          <span className="text-3xl font-medium text-muted-foreground md:text-4xl">$</span>
          <span className="text-7xl font-semibold tabular-nums tracking-tight md:text-8xl">{dollars}</span>
          <span className="text-3xl font-medium text-muted-foreground md:text-4xl">.{cents}</span>
        </div>
        {availableCash != null && (
          <p className="mt-3 text-center font-mono text-xs text-muted-foreground">
            ${availableCash.toFixed(2)} available
          </p>
        )}
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {PRESETS.map((pct) => {
          // Don't resolve a target — or treat any preset as active — until
          // availableCash has actually loaded. Previously the 100% preset
          // fell back to a literal $100 target, which coincidentally matched
          // the default state.amount and rendered the button as active for
          // a frame before the real cash arrived ("black for a sec then
          // unbuttoned").
          const target =
            availableCash != null ? (availableCash * pct) / 100 : null;
          const active =
            target != null && Math.abs(state.amount - target) < 0.01;
          const ready = target != null;
          return (
            <button
              key={pct}
              type="button"
              disabled={!ready}
              onClick={() => ready && set({ amount: +target!.toFixed(2) })}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {pct}%
            </button>
          );
        })}
        <Input type="number" min={0} step={1}
          className="w-32 text-right"
          value={state.amount}
          onChange={(e) => set({ amount: parseFloat(e.target.value) || 0 })} />
      </div>

      <div className="mt-12 grid grid-cols-2 gap-4 border-t border-border/40 pt-8 md:grid-cols-4">
        <CapInput label="Max position size %" value={state.caps.maxPositionPct}
          onChange={(v) => setCap("maxPositionPct", v)} />
        <CapInput label="Max positions" value={state.caps.maxPositions}
          onChange={(v) => setCap("maxPositions", v)} />
        <CapInput label="Stop-loss %" value={state.caps.perPositionStopLossPct}
          onChange={(v) => setCap("perPositionStopLossPct", v)} />
        <CapInput label="Take-profit %" value={state.caps.perPositionTakeProfitPct}
          onChange={(v) => setCap("perPositionTakeProfitPct", v)} />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4">
        <CapInput label="Max drawdown stop %" value={state.caps.maxDrawdownPct}
          onChange={(v) => setCap("maxDrawdownPct", v)} hint="account-level kill switch" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-3 border-t border-border/40 pt-8 md:grid-cols-2">
        <div>
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Direction</Label>
          <div className="mt-2 grid grid-cols-3 overflow-hidden rounded-md border border-border/60">
            {(["long", "short", "both"] as const).map((d) => (
              <button key={d} onClick={() => set({ direction: d })}
                className={`py-2 text-sm capitalize ${state.direction === d ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <ToggleRow label="Skip names I already hold" checked={state.skipHeld}
            onChange={(v) => set({ skipHeld: v })} />
          <ToggleRow label="Live trading" checked={state.isLiveTrading}
            onChange={(v) => set({ isLiveTrading: v })} />
          <ToggleRow label="Sentiment signals" checked={state.isSentimentEnabled}
            onChange={(v) => set({ isSentimentEnabled: v })} />
        </div>
      </div>

      <Button className="mt-10 h-14 w-full text-base" onClick={onPreview} disabled={loading || state.amount <= 0}>
        {loading ? "Loading…" : "Preview picks →"}
      </Button>
    </div>
  );
}

function CapInput({ label, value, onChange, hint }: {
  label: string; value: number; onChange: (v: number) => void; hint?: string;
}) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</Label>
      <Input type="number" min={0} step={1} className="mt-2"
        value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
