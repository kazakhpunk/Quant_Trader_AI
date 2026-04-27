"use client";

import {
  Activity,
  Filter,
  GitMerge,
  Sparkles,
  TrendingUp,
  Gauge,
  Shield,
  Wallet,
  Calendar,
  LineChart,
} from "lucide-react";
import { InfoDialog } from "./info-dialog";

export function PairsInfoDialog() {
  return (
    <InfoDialog
      trigger="Pipeline notes"
      kicker="Methodology · §PAIRS"
      title="How pairs are picked."
      subtitle="The pair pipeline narrows the universe down to a handful of statistically co-moving relationships you can actually trade."
      formula={[
        { k: "candidate", v: "every unique unordered pair within the same category" },
        { k: "passes if", v: "Engle-Granger p ≤ 0.10 ∧ corr ≥ 0.5 ∧ half-life ≤ 40 d" },
      ]}
      sections={[
        {
          n: "01",
          kicker: "Candidate set",
          title: "Same-category pairs only",
          body:
            "Pairs are formed within categories (region/region, rating/rating, etc.) so the pipeline doesn't try to cointegrate an HY corporate spread bucket with a Treasury ETF.",
          bullets: [{ k: "Outcome", v: "~30-40 candidates from a 22-asset universe" }],
          icon: Filter,
        },
        {
          n: "02",
          kicker: "Cointegration",
          title: "Engle-Granger residual stationarity",
          body:
            "Regress one series on the other (OLS), then ADF-test the residual. A low p-value means the spread between them mean-reverts rather than wanders.",
          bullets: [
            { k: "Threshold", v: "p ≤ 0.10 (loosened from academic 0.05 — small universe)" },
            { k: "Why", v: "Stationary residual → tradeable spread relationship" },
          ],
          icon: GitMerge,
        },
        {
          n: "03",
          kicker: "Correlation gate",
          title: "First-difference Pearson correlation",
          body:
            "Cointegration alone can be a false positive on slow-trending series. Requiring high correlation on day-over-day changes catches that — both series should move together intraday.",
          bullets: [{ k: "Threshold", v: "corr ≥ 0.5 on Δy vs Δx" }],
          icon: Activity,
        },
        {
          n: "04",
          kicker: "Half-life",
          title: "Ornstein-Uhlenbeck mean-reversion speed",
          body:
            "Fit an OU process to the cointegration residual. The half-life is how many days it takes a dislocation to revert halfway. Too long → not actionable.",
          bullets: [{ k: "Threshold", v: "half-life ≤ 40 trading days" }],
          icon: Sparkles,
        },
      ]}
      footerNote="Loosen thresholds in pair-pipeline.ts if the funnel is too tight"
    />
  );
}

export function SignalsInfoDialog() {
  return (
    <InfoDialog
      trigger="Signal anatomy"
      kicker="Methodology · §SIGNALS"
      title="How signals are made."
      subtitle="For every active pair, we compute a real-time dislocation read and a regime-stability check. A signal is tradeable when the relationship is dislocated AND still well-behaved."
      formula={[
        { k: "z-score", v: "(residual − μ) / σ on a 250-day rolling window" },
        { k: "tradeable", v: "CUSUM did not detect a regime break in the last 100 obs" },
      ]}
      sections={[
        {
          n: "01",
          kicker: "Inputs",
          title: "Active pairs only",
          body:
            "Signals are computed only for pairs that survived the cointegration → correlation → half-life funnel. Rejected pairs are silently ignored — they're not actionable in the first place.",
          icon: Filter,
        },
        {
          n: "02",
          kicker: "Hedge ratio",
          title: "2-state Kalman filter for time-varying β",
          body:
            "Rather than freezing the OLS β from the cointegration step, we re-estimate β and α at every timestep with a Kalman filter. The relationship can drift; the hedge ratio drifts with it.",
          bullets: [{ k: "State", v: "β (slope) + α (intercept), updated each new bar" }],
          icon: TrendingUp,
        },
        {
          n: "03",
          kicker: "z-score",
          title: "Standardized current dislocation",
          body:
            "Take the latest Kalman residual, standardize over a 250-day window. |z| > 2 is the conventional 'enter trade' threshold; |z| > 3.5 is 'stop out' territory.",
          bullets: [{ k: "Window", v: "250 trading days (~1 year)" }],
          icon: Gauge,
        },
        {
          n: "04",
          kicker: "Δ5d momentum",
          title: "Recent-direction sanity check",
          body:
            "5-day change in the residual, scaled by its short-window σ. Tells you whether the dislocation is still expanding or already mean-reverting — useful tiebreaker between entries.",
          icon: LineChart,
        },
        {
          n: "05",
          kicker: "Regime check",
          title: "CUSUM kill-switch",
          body:
            "Page CUSUM detector running over the last 100 residuals. If it trips, the cointegration relationship has likely broken — signal status flips to regime-broken and you don't trade it even at extreme z.",
          bullets: [{ k: "Tuning", v: "k = 0.5σ, h = 5 (standard Page settings)" }],
          icon: Shield,
        },
      ]}
      footerNote="Refresh button forces a recompute and bypasses the 5-min cache"
    />
  );
}

export function BacktestInfoDialog() {
  return (
    <InfoDialog
      trigger="Engine notes"
      kicker="Methodology · §BACKTEST"
      title="How the backtest runs."
      subtitle="Walk-forward simulation of the rule set against the historical spread series. No look-ahead; every entry/exit decision uses only data available up to that bar."
      formula={[
        { k: "open", v: "|z| ≥ entryZ on a tradeable pair" },
        { k: "close", v: "|z| ≤ exitZ ∨ |z| ≥ stopZ ∨ days held ≥ maxHoldingDays" },
      ]}
      sections={[
        {
          n: "01",
          kicker: "Trading rules",
          title: "z-score thresholds drive entries and exits",
          body:
            "Entries trigger at the entryZ extreme; exits at meanRevert (cross back through exitZ), stop (|z| beyond stopZ), or timeout (held longer than maxHoldingDays).",
          bullets: [
            { k: "Defaults", v: "entry 2.0 · exit 0.5 · stop 3.5 · max 60 d" },
            { k: "Per pair", v: "One open position at a time per pair" },
          ],
          icon: Gauge,
        },
        {
          n: "02",
          kicker: "Sizing",
          title: "Equal-weight or inverse-vol",
          body:
            "Equal-weight gives every pair the same notional. Inverse-vol scales each pair's weight inversely with its residual volatility — more capital to calmer pairs, less to noisy ones.",
          icon: Wallet,
        },
        {
          n: "03",
          kicker: "Costs",
          title: "Round-trip basis points",
          body:
            "A flat round-trip cost is deducted on every closed trade in basis points of the position notional. Captures bid-ask + execution slippage without modelling each market explicitly.",
          bullets: [{ k: "Default", v: "30 bps per round-trip" }],
          icon: Calendar,
        },
        {
          n: "04",
          kicker: "Metrics",
          title: "Standard performance set + deflated Sharpe",
          body:
            "Total return, annualized return/vol, Sharpe, Sortino, max drawdown, hit rate, average holding days, turnover. Deflated Sharpe adjusts the headline Sharpe for the number of pairs you tested — a reality check against multiple-comparisons inflation.",
          icon: TrendingUp,
        },
      ]}
      footerNote="Each run is saved — open History to compare past configurations"
    />
  );
}
