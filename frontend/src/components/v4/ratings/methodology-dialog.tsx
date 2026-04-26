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
};

const DIMENSIONS: Dim[] = [
  {
    n: "01",
    kicker: "Technical",
    title: "Short-term momentum & structure",
    driver: "RSI-14 (Relative Strength Index)",
    formula: "score = 100 − |RSI − 50| × 2",
    plain:
      "Today's normalizer scores RSI 50 as healthiest and treats both overbought (>70) and oversold (<30) as risky. A long/short split is on the way — once it lands, low RSI will boost long scores and high RSI will boost short scores.",
    terms: [
      { term: "RSI", meaning: "0–100 momentum oscillator. <30 oversold, >70 overbought, ~50 neutral." },
      { term: "SMA20 / SMA50", meaning: "Simple moving averages. SMA20 > SMA50 = short-term uptrend." },
      { term: "EMA20 / EMA50", meaning: "Exponential moving averages — same idea but weights recent prices more." },
    ],
    icon: Activity,
  },
  {
    n: "02",
    kicker: "Fundamental",
    title: "Is the business worth owning?",
    driver: "P/E (Price ÷ Earnings)",
    formula: "score = 100 − |P/E − 15| × 2   (P/E ≤ 0 → 0)",
    plain:
      "Triangle around 15, the historical 'fair' P/E. Losses are auto-zeroed. Other fundamental columns are shown for context but don't currently affect the score.",
    terms: [
      { term: "P/E", meaning: "How many years of current earnings the price represents. ~15 = fair." },
      { term: "PEG", meaning: "P/E adjusted for earnings growth. <1 = cheap relative to growth rate." },
      { term: "Margin", meaning: "Profit margin — share of revenue that becomes profit. Negative = burning cash." },
      { term: "Div yield", meaning: "Annual dividend ÷ share price." },
      { term: "Payout", meaning: "Share of earnings paid out as dividend. >100% = unsustainable." },
    ],
    icon: Building2,
  },
  {
    n: "03",
    kicker: "Sentiment",
    title: "What is the market saying right now?",
    driver: "Mean polarity of latest 10 news headlines",
    formula: "score = 50 + sentiment × 5",
    plain:
      "Headlines are scored with the `sentiment` npm package (rule-based NLP, integer scores per word). The mean across articles maps linearly to the 0–100 dimension score.",
    terms: [
      { term: "Sentiment score", meaning: "Mean polarity across recent headlines. 0 = neutral, +10 = strongly positive, −10 = strongly negative." },
      { term: "Articles", meaning: "Number of headlines that fed the score. Higher = more confidence in the signal." },
    ],
    icon: MessageSquareText,
  },
  {
    n: "04",
    kicker: "Price",
    title: "Where the price is actually heading",
    driver: "30-day percent change",
    formula: "score = 50 + pct30d × 2.5",
    plain:
      "Centered on 0% return: a flat name scores 50, +20% over the month scores 100, −20% scores 0. 1d and 5d returns are shown for context but don't affect the score.",
    terms: [
      { term: "1d %", meaning: "Today's percent change vs yesterday's close." },
      { term: "5d %", meaning: "5-trading-day percent change. Filters out single-day noise." },
      { term: "30d %", meaning: "30-day percent change — the medium-term trend signal driving the score." },
    ],
    icon: TrendingUp,
  },
  {
    n: "05",
    kicker: "Volatility",
    title: "How much it swings — risk per dollar",
    driver: "Annualized standard deviation of daily returns",
    formula: "score = 100 − σ_ann × 1.25",
    plain:
      "Lower volatility = higher score, because a stable name is safer to size into. Drives stop-loss placement and position sizing more than direction.",
    terms: [
      { term: "30d σ (ann.)", meaning: "Standard deviation of last 30 daily returns × √252. ~15-20% = market-typical, 40%+ is volatile." },
      { term: "ATR-14", meaning: "Average True Range over 14 bars — the typical dollar swing per day. Used for stop-width." },
    ],
    icon: Waves,
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
          <span>How scores work</span>
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
            The composite (0–100) averages three equally-weighted dimensions:
            <span className="text-foreground"> technical, fundamental, sentiment</span>.
            Price and volatility are shown for context but excluded from the score —
            per industry convention, price returns belong inside technical and
            volatility is a risk overlay used for sizing, not picking.
          </p>

          {/* formula strip */}
          <div className="relative mt-6 grid gap-2 border-t border-border/40 pt-4 font-mono text-[11px] text-muted-foreground sm:grid-cols-[auto_1fr] sm:gap-x-4">
            <span className="uppercase tracking-wider text-foreground">composite</span>
            <span>= round( (technical + fundamental + sentiment) ÷ 3 )</span>
            <span className="uppercase tracking-wider text-foreground">price · vol</span>
            <span>= shown as informational columns; do not affect the composite</span>
            <span className="uppercase tracking-wider text-foreground">missing data</span>
            <span>= dimension defaults to 50 (neutral) — neither helps nor hurts</span>
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
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    {d.kicker}
                  </p>
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
                      <span className="w-16 shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Formula
                      </span>
                      <code className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-xs text-foreground/90">
                        {d.formula}
                      </code>
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
            Each dimension uses one metric today · multi-metric weighting on the roadmap
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
