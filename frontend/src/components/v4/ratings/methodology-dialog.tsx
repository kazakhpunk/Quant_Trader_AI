"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Info,
  Activity,
  Building2,
  MessageSquareText,
  TrendingUp,
  Waves,
} from "lucide-react";

type Dim = {
  n: string;
  kicker: string;
  title: string;
  driver: string;
  formula: string;
  plain: string;
  terms: { term: string; meaning: string }[];
  icon: React.ComponentType<{ className?: string }>;
  /** Whether this dimension contributes to the composite score. False for
   *  Price and Volatility — they're shown as context but excluded. */
  inComposite: boolean;
};

const DIMENSIONS: Dim[] = [
  {
    n: "01",
    kicker: "Technical",
    title: "Momentum and trend",
    driver: "RSI-14 · SMA20/50 trend · EMA20/50 trend",
    formula:
      "score = mean( clamp(100 − rsi),  clamp(50 + smaGap% × 5),  clamp(50 + emaGap% × 5) )",
    plain:
      "Three direction-aware reads averaged: RSI catches short-term momentum, the SMA gap catches slow trend, the EMA gap catches the same trend faster. Components missing from the upstream data are dropped before averaging.",
    terms: [
      { term: "RSI", meaning: "0–100 momentum oscillator. <30 oversold (good for long), >70 overbought (good for short)." },
      { term: "SMA20 / SMA50", meaning: "Simple moving averages. SMA20 above SMA50 = uptrend." },
      { term: "EMA20 / EMA50", meaning: "Exponential moving averages — same trend signal but recency-weighted, reacts faster." },
      { term: "gap%", meaning: "(fast − slow) / slow × 100 — relative gap so a $5 stock and $500 stock with the same percentage gap score the same. Saturates at ±10%." },
    ],
    icon: Activity,
    inComposite: true,
  },
  {
    n: "02",
    kicker: "Fundamental",
    title: "Is the business worth owning?",
    driver: "P/E · PEG · profit margin",
    formula: "score = mean( peScore, pegScore, marginScore )",
    plain:
      "Three valuation reads averaged. P/E is price relative to current earnings (anchored at 15). PEG adjusts P/E for growth (anchored at 1). Margin captures pricing power. Each is direction-aware and clamped to 0–100.",
    terms: [
      { term: "peScore (long)", meaning: "pe ≤ 0 → 0; pe < 15 → 100; else clamp(100 − (pe − 15) × 2). Short side mirrors." },
      { term: "pegScore (long)", meaning: "peg ≤ 0 → 50; else clamp(125 − peg × 50). Short side mirrors." },
      { term: "marginScore (long)", meaning: "clamp(50 + margin × 200). Decimal input (0.10 = 10%). Short side mirrors." },
      { term: "Div yield · Payout", meaning: "Shown for context. High yield can be a value trap; high payout can be unsustainable. Excluded from the score." },
    ],
    icon: Building2,
    inComposite: true,
  },
  {
    n: "03",
    kicker: "Sentiment",
    title: "What is the market saying right now?",
    driver: "Headline polarity × article-count confidence",
    formula:
      "confidence = min(1, newsCount / 20)\nscore = confidence × clamp(50 + s × 5) + (1 − confidence) × 50",
    plain:
      "Headlines are scored with the `sentiment` npm package (rule-based NLP, integer per-word polarity). The mean across articles maps linearly to a 0–100 polarity score, then attenuated toward neutral 50 in proportion to (1 − confidence). 0 articles → score = 50; 20+ articles → full polarity.",
    terms: [
      { term: "s", meaning: "Mean per-article sentiment polarity. ~ −10 strongly negative, 0 neutral, +10 strongly positive." },
      { term: "newsCount", meaning: "Number of headlines that fed the polarity score. Drives the confidence weight." },
      { term: "confidence", meaning: "min(1, newsCount / 20). With 5 articles you get 25% confidence; 20+ articles gives full weight." },
    ],
    icon: MessageSquareText,
    inComposite: true,
  },
  {
    n: "04",
    kicker: "Price",
    title: "Where the price is heading",
    driver: "30-day percent change",
    formula: "score = clamp(50 + pct30d × 2.5)",
    plain:
      "Centered on 0% return: a flat name scores 50, +20% over the month scores 100, −20% scores 0. 1d and 5d returns are shown for context but don't affect the score.",
    terms: [
      { term: "1d %", meaning: "Today's percent change vs yesterday's close." },
      { term: "5d %", meaning: "5-trading-day percent change. Filters out single-day noise." },
      { term: "30d %", meaning: "30-day percent change — the medium-term trend signal driving the score." },
    ],
    icon: TrendingUp,
    inComposite: false,
  },
  {
    n: "05",
    kicker: "Volatility",
    title: "How much it swings — risk per dollar",
    driver: "Annualized standard deviation of daily returns",
    formula:
      "long  = clamp(100 − σ_ann × 1.25)\nshort = clamp(100 − σ_ann × 1.5)   // shorts penalize vol harder",
    plain:
      "Lower volatility = higher score, because a stable name is safer to size into. Drives stop-loss placement and position sizing more than direction. Shorts dock vol harder because squeeze risk is asymmetric.",
    terms: [
      { term: "30d σ (ann.)", meaning: "Standard deviation of last 30 daily returns × √252. ~15-20% market-typical, 40%+ is volatile." },
      { term: "ATR-14", meaning: "Average True Range over 14 bars — typical dollar swing per day. Used for stop-width." },
    ],
    icon: Waves,
    inComposite: false,
  },
];

export function MethodologyDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border/70 bg-background px-2.5 text-[11px] font-medium uppercase tracking-wider text-foreground shadow-sm transition hover:bg-muted/40"
        >
          <Info className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">How scores work</span>
          <span className="xl:hidden">Scores</span>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl overflow-hidden border-border/60 p-0 sm:rounded-xl">
        <DialogTitle className="sr-only">How ratings are calculated</DialogTitle>

        {/* HEADER — masthead */}
        <div className="relative border-b border-border/60 bg-gradient-to-br from-muted/40 via-background to-background px-8 pt-8 pb-7">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="relative flex items-baseline justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Methodology · §RT
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              composite = mean(3)
            </p>
          </div>
          <h2 className="relative mt-3 text-3xl font-semibold tracking-tight md:text-[2.5rem] md:leading-[1.05]">
            How scores are calculated.
          </h2>
          <p className="relative mt-2 max-w-xl text-sm text-muted-foreground">
            The composite (0–100) is the equally-weighted mean of just three
            dimensions:{" "}
            <span className="text-foreground">technical, fundamental, sentiment</span>.{" "}
            <span className="text-foreground">Price and volatility are excluded</span>{" "}
            — they're displayed alongside as context, but the composite ignores
            them. Inside each dimension, every contributing metric is normalized
            to 0–100 and the dimension is the mean of those components.
          </p>

          {/* formula strip */}
          <div className="relative mt-6 grid gap-2 border-t border-border/40 pt-4 font-mono text-[11px] text-muted-foreground sm:grid-cols-[auto_1fr] sm:gap-x-4">
            <span className="uppercase tracking-wider text-foreground">composite</span>
            <span>= round( (technical + fundamental + sentiment) ÷ 3 )</span>
            <span className="uppercase tracking-wider text-foreground">price · vol</span>
            <span>= shown as informational columns; do not affect the composite</span>
            <span className="uppercase tracking-wider text-foreground">missing data</span>
            <span>= component dropped from the dimension's mean; if all components missing, dim defaults to 50</span>
          </div>
        </div>

        {/* BODY — dimensions */}
        <div className="max-h-[60vh] overflow-y-auto px-8 py-7">
          <ol className="space-y-7">
            {DIMENSIONS.map((d) => (
              <li
                key={d.n}
                className="group relative grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-l border-border/50 pl-6 transition-colors hover:border-foreground/40"
              >
                <span
                  aria-hidden
                  className="font-mono text-3xl font-light leading-none text-muted-foreground/40 tabular-nums transition-colors group-hover:text-foreground/60 md:text-4xl"
                >
                  {d.n}
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      {d.kicker}
                    </p>
                    <span
                      className={
                        d.inComposite
                          ? "rounded-full border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400"
                          : "rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-700 dark:text-amber-400"
                      }
                    >
                      {d.inComposite ? "In composite" : "Informational · not in composite"}
                    </span>
                  </div>
                  <h3 className="mt-1 text-lg font-semibold tracking-tight md:text-xl">
                    {d.title}
                  </h3>

                  <div className="mt-3 space-y-1.5 text-sm">
                    <div className="flex items-baseline gap-3">
                      <span className="w-16 shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Driver
                      </span>
                      <span className="text-foreground/85">{d.driver}</span>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <span className="w-16 shrink-0 pt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Formula
                      </span>
                      <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-muted/60 px-1.5 py-0.5 font-mono text-xs leading-relaxed text-foreground/90">
{d.formula}
                      </pre>
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {d.plain}
                  </p>

                  <ul className="mt-4 space-y-1.5 border-t border-border/40 pt-3">
                    {d.terms.map((t) => (
                      <li key={t.term} className="flex items-baseline gap-3 text-sm">
                        <span className="w-28 shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          {t.term}
                        </span>
                        <span className="text-foreground/85">{t.meaning}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <d.icon
                  aria-hidden
                  className="pointer-events-none absolute right-0 top-1 h-5 w-5 text-muted-foreground/30 transition-colors group-hover:text-foreground/60"
                />
              </li>
            ))}
          </ol>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between gap-4 border-t border-border/60 bg-muted/20 px-8 py-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Each dimension averages every available component metric — multi-metric weighting on the roadmap.
          </p>
          <Button onClick={() => setOpen(false)} className="gap-2">
            Got it
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
