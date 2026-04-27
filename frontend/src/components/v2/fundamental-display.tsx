"use client";

import * as React from "react";
import { Combobox } from "./combobox";
import { getApiUrl, cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { useOrderDrawer } from "@/lib/order-drawer-store";
import {
  Activity,
  TrendingUp,
  Coins,
  Wallet,
  Banknote,
  Percent,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────
// Metric definitions — drives the card grid + verdict logic.
// Each metric has a kicker (mono uppercase), formatter, and a `judge`
// function that returns a colored verdict + a one-line plain-English context.
// ─────────────────────────────────────────────────────────────────────────

type Tone = "good" | "warn" | "bad" | "neutral";

interface Verdict {
  label: string;
  tone: Tone;
  context: string;
}

interface MetricSpec {
  key: string;
  index: string;
  kicker: string;
  title: string;
  benchmark: string;
  icon: React.ComponentType<{ className?: string }>;
  format: (v: number) => { value: string; unit?: string };
  judge: (v: number | null | undefined) => Verdict;
}

const fmtMoney = (v: number) => {
  // Compact human-readable money — billions / millions.
  const abs = Math.abs(v);
  if (abs >= 1e12) return { value: (v / 1e12).toFixed(2), unit: "T" };
  if (abs >= 1e9) return { value: (v / 1e9).toFixed(2), unit: "B" };
  if (abs >= 1e6) return { value: (v / 1e6).toFixed(2), unit: "M" };
  return { value: v.toLocaleString(), unit: "" };
};

const fmtRatio = (v: number) => ({ value: v.toFixed(2), unit: "x" });
const fmtPct = (v: number) => ({ value: (v * 100).toFixed(2), unit: "%" });

const NEUTRAL: Verdict = {
  label: "NO DATA",
  tone: "neutral",
  context: "This metric isn't reported for this ticker.",
};

const METRICS: MetricSpec[] = [
  {
    key: "peRatio",
    index: "01",
    kicker: "Valuation",
    title: "P/E ratio",
    benchmark: "ideal ≈ 15",
    icon: TrendingUp,
    format: fmtRatio,
    judge: (v) => {
      if (v == null || Number.isNaN(v)) return NEUTRAL;
      if (v <= 0)
        return { label: "NEGATIVE EARNINGS", tone: "bad", context: "Earnings are negative — the ratio cannot be interpreted as a valuation signal." };
      if (v < 10)
        return { label: "BELOW MARKET AVERAGE", tone: "good", context: "Trading below the long-run market multiple — value or skepticism, depending on growth." };
      if (v <= 25)
        return { label: "WITHIN AVERAGE RANGE", tone: "warn", context: "Inside the historical average band — neither discounted nor stretched." };
      return { label: "ABOVE MARKET AVERAGE", tone: "bad", context: "Priced for above-average growth — earnings must keep pace to justify the multiple." };
    },
  },
  {
    key: "pegRatio",
    index: "02",
    kicker: "Growth-adj.",
    title: "PEG ratio",
    benchmark: "ideal < 1.0",
    icon: Activity,
    format: fmtRatio,
    judge: (v) => {
      if (v == null || Number.isNaN(v)) return NEUTRAL;
      if (v <= 0)
        return { label: "NOT MEANINGFUL", tone: "neutral", context: "Negative or zero growth makes the ratio uninformative." };
      if (v < 1)
        return { label: "BELOW 1.0", tone: "good", context: "P/E is low relative to earnings growth — a growth-adjusted value indication." };
      if (v <= 2)
        return { label: "WITHIN 1.0–2.0", tone: "warn", context: "Price and growth are roughly aligned on a growth-adjusted basis." };
      return { label: "ABOVE 2.0", tone: "bad", context: "Investors are paying a premium beyond what current growth supports." };
    },
  },
  {
    key: "dividendYield",
    index: "03",
    kicker: "Income",
    title: "Dividend yield",
    benchmark: "S&P avg ≈ 1.5%",
    icon: Coins,
    format: fmtPct,
    judge: (v) => {
      if (v == null || Number.isNaN(v)) return NEUTRAL;
      if (v <= 0)
        return { label: "NO DISTRIBUTION", tone: "neutral", context: "The company reinvests rather than paying out earnings." };
      if (v < 0.02)
        return { label: "BELOW MARKET AVERAGE", tone: "warn", context: "Yield trails the broad-market average — total return relies on price appreciation." };
      if (v <= 0.05)
        return { label: "ABOVE MARKET AVERAGE", tone: "good", context: "A meaningful yield without obvious signs of an overstretched payout." };
      return { label: "ELEVATED — REVIEW", tone: "warn", context: "Yield is well above market average — verify it isn't an artifact of a recent price decline." };
    },
  },
  {
    key: "payoutRatio",
    index: "04",
    kicker: "Sustainability",
    title: "Payout ratio",
    benchmark: "safe < 60%",
    icon: Percent,
    format: fmtPct,
    judge: (v) => {
      if (v == null || Number.isNaN(v)) return NEUTRAL;
      if (v <= 0)
        return { label: "NO DISTRIBUTION", tone: "neutral", context: "No earnings are paid out as dividends." };
      if (v < 0.5)
        return { label: "BELOW 50%", tone: "good", context: "Most earnings are retained — supports growth funding and resilience to weak quarters." };
      if (v <= 0.8)
        return { label: "WITHIN 50–80%", tone: "warn", context: "A larger share of earnings is distributed — manageable if earnings remain stable." };
      return { label: "ABOVE 80%", tone: "bad", context: "Distribution exceeds prudent coverage — dividend reduction is plausible if earnings decline." };
    },
  },
  {
    key: "revenue",
    index: "05",
    kicker: "Scale",
    title: "Revenue",
    benchmark: "ttm",
    icon: Banknote,
    format: fmtMoney,
    judge: (v) => {
      if (v == null || Number.isNaN(v)) return NEUTRAL;
      if (v >= 1e11) return { label: "ABOVE $100B", tone: "good", context: "Index-defining scale — broad analyst coverage and lower idiosyncratic risk." };
      if (v >= 1e10) return { label: "WITHIN $10B–$100B", tone: "good", context: "Established operating scale with broad market coverage." };
      if (v >= 1e9) return { label: "WITHIN $1B–$10B", tone: "warn", context: "Mid-size revenue base — more exposed to single-segment performance." };
      return { label: "BELOW $1B", tone: "warn", context: "Smaller revenue base — higher growth ceiling but greater single-name volatility." };
    },
  },
  {
    key: "profitMargin",
    index: "06",
    kicker: "Profitability",
    title: "Profit margin",
    benchmark: "S&P median ≈ 10%",
    icon: TrendingUp,
    format: fmtPct,
    judge: (v) => {
      if (v == null || Number.isNaN(v)) return NEUTRAL;
      if (v < 0)
        return { label: "NEGATIVE", tone: "bad", context: "Operations consume more than they generate — capital structure and runway are central concerns." };
      if (v < 0.05)
        return { label: "BELOW 5%", tone: "warn", context: "Narrow margins leave limited room to absorb cost increases." };
      if (v <= 0.15)
        return { label: "WITHIN 5–15%", tone: "good", context: "Above-average operating efficiency — revenue converts to profit cleanly." };
      return { label: "ABOVE 15%", tone: "good", context: "Margins materially above the broad-market median — typically reflects scale or pricing power." };
    },
  },
  {
    key: "freeCashFlow",
    index: "07",
    kicker: "Cash discipline",
    title: "Free cash flow",
    benchmark: "ttm",
    icon: Wallet,
    format: fmtMoney,
    judge: (v) => {
      if (v == null || Number.isNaN(v)) return NEUTRAL;
      if (v < 0)
        return { label: "NEGATIVE", tone: "bad", context: "Operating and capital expenditures exceed cash generation — depends on external financing." };
      if (v < 1e8)
        return { label: "BELOW $100M", tone: "warn", context: "Cash generation is positive but the buffer is limited." };
      return { label: "ABOVE $100M", tone: "good", context: "Sufficient internal cash to fund growth, buybacks, and dividends without reliance on debt." };
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Tone styling map
// ─────────────────────────────────────────────────────────────────────────

const TONE: Record<
  Tone,
  { tag: string; rail: string; bullet: string; numText: string }
> = {
  good: {
    tag: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    rail: "from-emerald-500/0 via-emerald-500/60 to-emerald-500/0",
    bullet: "bg-emerald-500",
    numText: "text-foreground",
  },
  warn: {
    tag: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    rail: "from-amber-500/0 via-amber-500/60 to-amber-500/0",
    bullet: "bg-amber-500",
    numText: "text-foreground",
  },
  bad: {
    tag: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400",
    rail: "from-rose-500/0 via-rose-500/60 to-rose-500/0",
    bullet: "bg-rose-500",
    numText: "text-foreground",
  },
  neutral: {
    tag: "border-border/60 bg-muted/40 text-muted-foreground",
    rail: "from-muted-foreground/0 via-muted-foreground/40 to-muted-foreground/0",
    bullet: "bg-muted-foreground/50",
    numText: "text-muted-foreground",
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────────────────────────────────

function MetricCard({
  spec,
  raw,
}: {
  spec: MetricSpec;
  raw: number | null | undefined;
}) {
  const verdict = spec.judge(raw);
  const tone = TONE[verdict.tone];
  const formatted =
    raw == null || Number.isNaN(raw)
      ? { value: "—", unit: "" }
      : spec.format(raw);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/60 bg-background/60 p-5",
        "shadow-sm backdrop-blur-sm transition-all duration-300 ease-out",
        "hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-xl hover:shadow-foreground/[0.06]",
        "focus-within:border-foreground/40 focus-within:shadow-xl",
      )}
    >
      {/* Left accent rail — slides in on hover */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-3 left-0 w-[2px] origin-bottom scale-y-0 rounded-full bg-gradient-to-b transition-transform duration-300 ease-out group-hover:scale-y-100",
          tone.rail,
        )}
      />

      {/* Faint grid texture */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Top row */}
      <div className="relative flex items-start justify-between">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] font-light tabular-nums text-muted-foreground/70">
            {spec.index}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {spec.kicker}
          </span>
        </div>
        <spec.icon
          aria-hidden
          className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-foreground/70"
        />
      </div>

      {/* Title */}
      <h3 className="relative mt-3 text-sm font-medium tracking-tight text-foreground/80">
        {spec.title}
      </h3>

      {/* Big number */}
      <div className="relative mt-2 flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-mono text-3xl font-semibold tabular-nums transition-colors md:text-[2rem] md:leading-none",
            tone.numText,
          )}
        >
          {formatted.value}
        </span>
        {formatted.unit && (
          <span className="font-mono text-base text-muted-foreground">
            {formatted.unit}
          </span>
        )}
      </div>

      {/* Verdict tag */}
      <div className="relative mt-3 flex items-center gap-2">
        <span className={cn("h-1.5 w-1.5 rounded-full", tone.bullet)} />
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
            tone.tag,
          )}
        >
          {verdict.label}
        </span>
      </div>

      {/* Context line */}
      <p className="relative mt-3 text-xs leading-relaxed text-muted-foreground">
        {verdict.context}
      </p>

      {/* Benchmark footer */}
      <div className="relative mt-4 flex items-center justify-between border-t border-border/40 pt-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
          Benchmark · {spec.benchmark}
        </span>
        <ArrowRight
          aria-hidden
          className="h-3 w-3 -translate-x-1 text-muted-foreground/0 transition-all duration-300 group-hover:translate-x-0 group-hover:text-foreground/60"
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Skeletons
// ─────────────────────────────────────────────────────────────────────────

function MetricSkeleton() {
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 animate-pulse rounded bg-muted/60" />
        <div className="h-4 w-4 animate-pulse rounded bg-muted/60" />
      </div>
      <div className="mt-4 h-8 w-32 animate-pulse rounded bg-muted/60" />
      <div className="mt-3 h-4 w-24 animate-pulse rounded-full bg-muted/60" />
      <div className="mt-3 h-3 w-full animate-pulse rounded bg-muted/40" />
      <div className="mt-1.5 h-3 w-3/4 animate-pulse rounded bg-muted/40" />
      <div className="mt-4 border-t border-border/40 pt-3">
        <div className="h-3 w-28 animate-pulse rounded bg-muted/40" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────

export default function FundamentalAnalysis() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const openDrawer = useOrderDrawer((s) => s.open);
  const [selectedTicker, setSelectedTicker] = React.useState<string>("AAPL");
  const [analysisData, setAnalysisData] = React.useState<any>(null);

  const fetchFundData = async (ticker: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${getApiUrl()}/api/v1/postFundamentalData/${ticker}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );
      if (!response.ok) throw new Error(`Error: ${response.statusText}`);
      const result = await response.json();
      setAnalysisData(result);
    } catch (e) {
      console.error("Error fetching data:", e);
      setError("Failed to fetch data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchFundData(selectedTicker);
  }, [selectedTicker]);

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      {/* MASTHEAD ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-muted/40 via-background to-background px-6 py-6 sm:px-8 sm:py-7">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Fundamental · §FUND
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Snapshot · Trailing 12-month
          </p>
        </div>

        <div className="relative mt-3 flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight md:text-[2.25rem] md:leading-[1.05]">
              Fundamental Analysis ·{" "}
              <span className="font-mono tabular-nums text-foreground">
                {selectedTicker}
              </span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Seven indicators across valuation, profitability, and cash —
              each evaluated against a reference benchmark with a brief
              interpretation.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Combobox onSelectTicker={setSelectedTicker} />
            <Button
              variant="outline"
              className="h-[36px] gap-1.5 rounded-md border-border/70 px-3 font-mono text-xs uppercase tracking-wider transition hover:-translate-y-px hover:border-foreground/40 hover:shadow-md"
              onClick={() => openDrawer(selectedTicker)}
            >
              Buy {selectedTicker}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* BODY ─────────────────────────────────────────────────────────── */}
      <div className="px-6 py-7 sm:px-8">
        {error ? (
          <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/5 px-5 py-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-rose-700 dark:text-rose-400">
                Fetch failed
              </p>
              <p className="mt-1 text-sm text-foreground/80">{error}</p>
              <button
                onClick={() => fetchFundData(selectedTicker)}
                className="mt-2 font-mono text-[11px] uppercase tracking-wider text-rose-700 underline-offset-2 hover:underline dark:text-rose-400"
              >
                Retry
              </button>
            </div>
          </div>
        ) : loading || !analysisData ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {METRICS.map((m) => (
              <MetricSkeleton key={m.key} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {METRICS.map((m) => (
              <MetricCard
                key={m.key}
                spec={m}
                raw={analysisData[m.key]}
              />
            ))}
          </div>
        )}
      </div>

      {/* FOOTER ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-6 py-3 sm:px-8">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Source · Yahoo Finance · refreshed on selection
        </p>
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Indicative classification — confirm with the ratings model
        </p>
      </div>
    </div>
  );
}
