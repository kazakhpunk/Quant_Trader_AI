# RV Trade — Design Spec

**Date:** 2026-04-26
**Branch:** `feat/rv-trade`
**Audience:** Brevan Howard EM credit PM (final-round interview demo)

## 1. Goal

Add a Relative Value (RV) trade module to quant-trader-ai that mirrors how an EM sovereign credit PM evaluates pairs trades: pair generation, dislocation monitoring, and historical backtesting. The feature is decision-support tooling — not live execution — because Alpaca does not trade EM sovereign cash bonds and the target PM explicitly stated the pod is discretionary, not systematic.

## 2. Non-goals

- Live order execution (Alpaca cannot route EM sovereign bonds; ETF proxies erase per-issuer granularity that RV requires).
- Paper P&L tracking against live signals (the PM did not ask for this; adds surface area without strategic value).
- Intra-curve trades (Brazil 2030 vs Brazil 2050). FRED OAS data is country-level only — flagged as a known data limitation.
- Multi-user collaboration features beyond reusing existing Clerk auth.

## 3. Data source

FRED ICE BofA OAS series, ~15 EM countries. Each country is one daily OAS series. Examples: Brazil, Mexico, Colombia, Chile, Peru, Turkey, South Africa, Poland, Hungary, Romania, Indonesia, Philippines, Malaysia, Egypt, Nigeria. Free, daily EOD, requires a FRED API key.

**Known limitations** (documented in the demo, not hidden):
- Country-level only — no per-bond granularity.
- Survivorship: Venezuela / Russia post-2022 / Argentina restructured silently disappear from FRED. Acknowledge in backtest UI.
- No point-in-time rating-watch feed → CUSUM regime-break is the only kill-switch.

## 4. Pair-selection pipeline

Defensible to a PM because every stage maps to either a peer-group intuition or a statistical test from the practitioner literature (Krauss/Caldeira/Moura 2016; Gatev/Goetzmann/Rouwenhorst 2006).

```
1. Bucket gate
   Buckets: oilExporters, latamIG, latamHY, cee, gcc, asiaIG, frontier
   A country may sit in multiple buckets.
   Within-bucket all-pairs combinations → ~70 candidates.

2. Engle-Granger cointegration filter
   Rolling 1y window on log spread levels.
   Keep p-value < 0.05.

3. Pearson correlation gate
   ΔOAS daily returns, 6mo window. Keep ρ > 0.7.

4. Ornstein-Uhlenbeck half-life filter
   Fit OU on residual; half-life = ln(2)/θ.
   Keep half-life ≤ 40 trading days.
```

Cosine similarity on a fundamentals feature vector (rating, region, oil-exporter, debt/GDP) is used **only** as a 2D PCA visualization on the Universe page — not as the pair selector. Justification: with ~15 series all loaded on the same global-risk principal components (Augustin et al., NBER w17586), cosine collapses toward "everything is similar"; cointegration tests an actual mean-reverting equilibrium.

## 5. Signal generation

- **Hedge ratio:** Kalman filter on β_t (state) and α_t (intercept). Display OLS β alongside in the UI for transparency. Defaults: state noise Q=1e-4, observation noise R=1e-3.
- **Residual:** `r_t = OAS_a,t − (β_t · OAS_b,t + α_t)`.
- **Long-term z-score:** `(r_t − μ_1y) / σ_1y` over rolling 1y window.
- **Short-term momentum overlay:** 5d Δresidual / σ_5d. Surfaced alongside the long-term z so the user can avoid catching falling knives.
- **CUSUM kill-switch:** rolling 60d CUSUM on standardized residuals (Page CUSUM with reference value k=0.5σ, decision threshold h=5σ). If max|CUSUM| > h, pair is marked `REGIME-BROKEN` and excluded from new entries (existing positions can still close).

**Trading-rule defaults (UI-tunable):** entry |z| ≥ 2.0, exit |z| ≤ 0.5, stop |z| ≥ 3.5, max holding 60 trading days.

## 6. Backtest engine

Event loop over historical trading days from `start` to `end`. Strict point-in-time discipline — no future data leaks into pipeline or signal computation.

**Per-day loop:**
1. Snapshot OAS for all universe members at day `t`.
2. Re-run pair pipeline using only data up to `t-1`.
3. For each open position: update Kalman β, recompute z. Close if `|z| ≤ exit_z` OR `|z| ≥ stop_z` OR `holding > max_hold`. Deduct round-trip cost. Book P&L.
4. For each pipeline-active pair where `|z| ≥ entry_z` and not already open: open. Deduct half round-trip cost.
5. Mark to market. Convention: when entering, we long the higher-spread leg ("cheap") and short β units of the lower-spread leg ("rich"). Daily P&L per pair = `notional · DV01 · (β · ΔOAS_rich,t − ΔOAS_cheap,t)` — positive when the spread converges (cheap tightens, rich widens). DV01 is a constant 7y proxy since FRED OAS is index-level with no per-bond duration available.
6. Sizing: `equal-weight` (default, principled — Gatev et al.) or `inverse-vol` toggle (1/σ_pair normalized).

**Cost model:** symmetric, configurable bps round-trip, default 30bps (mid of EM cash 20-50bps practitioner range), slider 0-100bps.

**Output (`BacktestRun`):**
- Equity curve (daily NAV).
- Trade log (entry/exit dates, entry z, exit z, P&L, holding days, pair).
- Aggregate metrics: total return, annualized return & vol, Sharpe, Sortino, max drawdown, hit rate, average holding, turnover, **deflated Sharpe** (Bailey & López de Prado 2014) given multiple-testing across pairs.

## 7. Backend module structure

```
backend/src/rv-trade/
  rv-types.ts             // Country, BondSeries, Pair, Signal, BacktestRun, TradingRules
  fred-client.ts          // FRED API wrapper (Bottleneck rate-limit, in-memory + Mongo cache)
  universe.ts             // ~15-country static metadata
  pair-pipeline.ts        // bucket → cointegration → corr → OU half-life
  signal-service.ts       // Kalman hedge ratio + residual + z + momentum + CUSUM
  backtest-engine.ts      // event-loop simulator with point-in-time discipline
  rv-controller.ts        // HTTP handlers
  rv-router.ts            // Express routes mounted at /api/rv
  rv-store.ts             // MongoDB persistence (snapshots, runs, pair cache)
  __tests__/              // unit tests for each module
```

**Routes (under `/api/rv`):**
- `GET  /universe`              → universe + 2D PCA coordinates
- `GET  /pairs`                 → pipeline output with per-stage status & reject reasons
- `GET  /signals`               → active pairs + z + Δ + half-life + REGIME-BROKEN flag
- `POST /signals/refresh`       → force-refresh FRED cache and recompute
- `POST /backtests`             → run backtest with config; returns run id
- `GET  /backtests`             → list past runs
- `GET  /backtests/:id`         → full run object

## 8. Frontend module structure

**Pages (`frontend/src/app/(front)/rv-trade/`):**
- `page.tsx` — Universe overview (table + 2D PCA scatter).
- `pairs/page.tsx` — Pipeline output with per-stage status.
- `signals/page.tsx` — Live cockpit: top-K active pairs sorted by |z|.
- `backtest/page.tsx` — Config sliders + run + results.
- `runs/[id]/page.tsx` — Historical run detail.

**Components (`frontend/src/components/v4/rv-trade/`):**
- `universe-map.tsx` — 2D PCA scatter (recharts ScatterChart).
- `pair-table.tsx` — Sortable, filterable pair candidates with reject reasons.
- `signal-table.tsx` — Top-K dislocations.
- `backtest-config.tsx` — Sliders for entry/exit/stop z, cost bps, sizing toggle, date range.
- `equity-curve.tsx` — Recharts LineChart of NAV.
- `metrics-card.tsx` — Sharpe, Sortino, max DD, hit rate, deflated Sharpe.
- `trade-log-table.tsx` — Per-trade entry/exit/P&L table.

**Sidebar (`frontend/src/lib/menu-list.ts`):** new top-level "RV Trade" entry with submenu (Universe, Pairs, Signals, Backtest, Runs).

## 9. Data model (MongoDB collections)

```
rv_signal_snapshots
  { _id, userEmail, ts, signals: [{ pairKey, z, delta5d, halfLife, status }] }

rv_backtest_runs
  { _id, userEmail, ts, config: TradingRules + sizing + costBps + dateRange,
    metrics: { sharpe, sortino, maxDD, hitRate, ... },
    equityCurve: [{ date, nav }],
    trades: [{ pairKey, entryDate, exitDate, entryZ, exitZ, pnl, days }] }

rv_pair_cache  (optional perf cache, TTL ~6h)
  { _id, pairKey, lastComputedTs, coint, beta, halfLife }
```

No new auth/user model — reuse Clerk session and key by `userEmail` like existing trade module.

## 10. Reuse from existing app

- MongoDB connection: `backend/src/db.ts`.
- Express routing pattern: matches `backend/src/trade/trade-router.ts`.
- Bottleneck rate limiter: same pattern as `trade-service.ts`.
- shadcn/ui components and v4 visual language for tables, cards, dialogs.
- Sidebar registration pattern in `frontend/src/lib/menu-list.ts`.

## 11. Testing strategy

- **Unit (backend):**
  - `pair-pipeline.test.ts` — synthetic OAS series with known cointegration / known broken regime; verify stage-by-stage filtering.
  - `signal-service.test.ts` — Kalman β converges on synthetic linear relation; z-score numerically matches numpy reference; CUSUM trips on injected break.
  - `backtest-engine.test.ts` — determinism (same config → same NAV); point-in-time guarantee (no future data accessed); cost model linearity.
  - `fred-client.test.ts` — cache hit/miss, rate-limit respect, error mapping.
- **Unit (frontend):** smoke tests for each page; component renders with mocked API.
- **Integration:** end-to-end run a tiny 2-country, 60-day backtest in CI and assert Sharpe is deterministic.

## 12. Demo script (interview narrative)

1. **Universe page** — "Here's the EM cash sovereign world I'm tracking. Each dot is a country positioned by fundamentals — rating, debt/GDP, oil-export share. Peers cluster naturally."
2. **Pairs page** — "I generate candidates within peer buckets, then filter by Engle-Granger cointegration, correlation, and OU half-life. Of 70 candidates, 12 survive — these are my tradeable pairs."
3. **Signals page** — "Today's cockpit. Sorted by |z|. Brazil-Mexico is at z=2.3 with a 28-day half-life and tightening 5-day momentum. Egypt-Nigeria is wide at z=2.8 but flagged REGIME-BROKEN by CUSUM — I won't enter."
4. **Backtest page** — "Same parameters, last 5 years. Sharpe 1.4 net of 30bps round-trip. Bumping costs to 50bps drops Sharpe to 0.9 — that's the cost sensitivity Krauss documented."
5. **Honesty:** "Country-level OAS limits us to cross-issuer pairs; intra-curve needs Bloomberg. Survivorship bias from FRED dropping defaulted issuers. CUSUM is a soft kill-switch — a real desk would also gate on rating-watch."

## 13. Open questions / deferred

- Rating-watch gate (S&P/Moody's/Fitch outlook) — no clean free feed; deferred.
- Per-bond duration adjustment — currently using 7y DV01 proxy uniformly; acknowledged.
- Multi-user separation of saved runs vs shared runs — not in scope; runs are user-scoped only.
