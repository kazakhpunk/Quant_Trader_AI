# App improvements: per-ticker trading, ratings, and a clearer engine flow

Date: 2026-04-25
Branch context: `feat/landing-redesign`
Status: Design — pending implementation plan

## Problem

The app today is functional but raw in three places:

1. **Trade is opaque.** `/trade` only exposes a $0–$100 allocation slider that fires the engine
   blindly. Users can't trade a specific ticker, can't see what the engine *will* buy before it
   buys it, and can't set risk controls per trade or per session.
2. **No per-ticker ratings.** The dashboard shows positions and orders but says nothing about
   *how the engine rates the things you own right now*. The five analysis dimensions
   (technical, fundamental, sentiment, price, volatility) live on separate pages, each with its
   own chart, with no roll-up surface.
3. **No way to act on a chart.** Looking at NVDA's technical chart and wanting to buy NVDA
   requires leaving the chart, going to `/trade`, and trusting the engine to pick it.

This design addresses all three together because they share a backbone: a per-ticker rating
endpoint, a per-ticker order ticket, and a clearer engine flow.

## Goals

- Trade a specific ticker, with quantity and order type, from anywhere a ticker appears.
- Make the engine flow legible: preview picks before commit, surface *why*, expose risk caps.
- Show composite ratings on the dashboard and a full ratings surface at `/analysis/ratings`.

## Non-goals

- Tunable composite weights (equal-weighted v1; user-tunable later).
- Stop / Stop-Limit / IOC / FOK order types in the drawer (Market + Limit only).
- Extended-hours toggle.
- Bracket-order management UI (cancel / modify a live bracket from the dashboard).
- Mobile-first redesign (existing responsive behavior is preserved, not extended).

## Architecture overview

Three new surfaces, one new backend endpoint, and one extension to the trade endpoint.

```
                ┌─────────────────────────────────────────────┐
                │  /analysis/ratings (new page)               │
                │   - composite table                         │
                │   - 5 dimension tables (stacked)            │
                │   - sticky sub-nav                          │
                └────────┬───────────────┬────────────────────┘
                         │ row click     │
                         ▼               ▼
   /dashboard ────► OrderDrawer (new) ◄──── /analysis/* (charts)
   (composite                                  (chart actions)
    column added)
                         │
                         ▼
              POST /api/v1/trade/order   (new — per-ticker order)
              POST /api/v1/trade/         (existing — engine flow,
                                           extended with caps + preview)

              GET  /api/v1/ratings        (new — per-ticker scores)
```

## Components

### 1. Per-ticker `OrderDrawer` (new)

A right-side `Sheet` (shadcn) that slides in over the current page. Drawer state lives in a
small `useOrderDrawer()` hook (zustand or a React context — whichever the project already uses
for global UI state; default to context if no store exists yet).

**Trigger surfaces:**
- Click any row in the `/dashboard` Open Positions table
- Click any row in any table on `/analysis/ratings`
- A small "Trade" button on each `/analysis/*` chart page header (passes the page's symbol)

**Fields (tier B from brainstorming):**
- Symbol (locked, shown as title)
- Side: `Buy` / `Sell` segmented control
- Quantity: numeric input with a `Shares ⇄ Dollars` toggle
  - When in dollars, qty is computed live as `dollars / current_price`, rounded to 2 decimals
    (matches existing fractional-share handling in `trade-service.placeSimpleOrder`)
- Order type: `Market` / `Limit` segmented control
  - When `Limit`, a `Limit price` input appears (defaults to current price, ±1% guidance text)
- Time-in-force: `Day` / `GTC`
- Live vs Paper toggle (inherits from `/trade` setting via shared state, can be overridden
  per-order)
- **Risk controls** (collapsible, collapsed by default):
  - Stop-loss `%` (default empty — no bracket if both fields empty)
  - Take-profit `%`
  - Below the inputs, a live preview: *"Filled at $182.40 → stop $176.93 (−3%), target $191.52
    (+5%)"*

**Live data line (always visible, just below the symbol):**
- Current price (polled every 5s while drawer is open, or pushed via existing socket if one
  exists — to confirm during build)
- Buying power: `$1,240 available cash`
- Inline error if `qty × price > buying power` (disables submit)

**Submit flow:**
- Button shows `Review Buy 0.42 NVDA · ~$76.61` (recomputes as inputs change)
- Click → in-drawer review state with the full order recap and a primary `Confirm` button
- Confirm → POST to `/api/v1/trade/order`
- Result → success state shows order id, status, and a link to dashboard; error state shows
  the message and keeps the form populated

### 2. Engine flow redesign on `/trade`

Replaces the current `TradePanel` in `frontend/src/components/v2/trade-form.tsx`. Same route,
same engine concept, four explicit steps so the user knows what they're committing to.

**Step 1 — Configure**
- Section header: `Allocate capital`
- Big amount input: any value up to available cash. Inline label: *"Total capital to deploy
  across all picks"* (kills "is it per-stock?" ambiguity). Right of input: `$1,240 available`.
- Presets: `25% · 50% · 75% · Max` (replace the old `$10 / $25 / $50 / $100` chips, which
  were dollar-capped).
- **Risk caps row** — three compact inputs in one strip:
  - `Max position size`: `% of allocation per ticker` (default 20%)
  - `Per-position stop-loss`: `%` (default 3%)
  - `Per-position take-profit`: `%` (default 5%)
- **Account-level guard** (separate row, single input):
  - `Max drawdown stop`: `% of starting equity` (default 10%) — when total unrealized P&L
    drops by this much from configured baseline, the engine refuses new entries
- **Filters row**:
  - Direction: `Long only` / `Short only` / `Both` (default Long only — current behavior)
  - `Skip names I already hold` toggle (default on)
  - Live / Paper toggle (existing)
  - `Sentiment signals` toggle (existing)
- Primary button: `Preview picks` (NOT "Purchase")

**Step 2 — Preview**
A POST to `/api/v1/trade/?dryRun=true` returns the engine's plan without placing orders.
Renders as a table:

| Ticker | Side | Composite | Why (top signals)       | Allocation     | ~Shares |
|--------|------|-----------|-------------------------|----------------|---------|
| NVDA   | Long | 84        | Tech 90 · Sent 86       | $186 (20%)     | 0.42    |
| MSFT   | Long | 79        | Fund 88 · Tech 75       | $186 (20%)     | 0.31    |
| ...    | ...  | ...       | ...                     | ...            | ...     |

Footer line: `Total: $930 of $1,000 · 5 positions · Stop −3% · Target +5%`.

Two buttons: `Adjust` (returns to step 1, preserving inputs) and `Place 5 orders` (primary).

**Step 3 — Execute**
On `Place orders`, POST to `/api/v1/trade/` (no dryRun) with the same payload. Button shows
loading state. Disabled until response.

**Step 4 — Result**
Inline result panel: a compact list of each placed order with status badge (filled / pending /
rejected) and the order id. Two CTAs: `View on dashboard` and `Make another allocation`
(returns to step 1 with cleared inputs).

### 3. Ratings page at `/analysis/ratings` (new)

One scrollable page with a sticky sub-nav at the top.

**Sub-nav (sticky):** `Composite · Technical · Fundamental · Sentiment · Price · Volatility`
— each anchor jumps to the corresponding table.

**Composite table (top):**

| Ticker | Composite | Tech | Fund | Sent | Price | Vol | Trade |
|--------|-----------|------|------|------|-------|-----|-------|
| NVDA   | 84        | 90   | 80   | 86   | 78    | 86  | →     |
| ...    |           |      |      |      |       |     |       |

Sortable on every column. Row click → `OrderDrawer`. The "Trade →" cell is a visual affordance,
not a separate action — the whole row is clickable.

**Five dimension tables (stacked below composite):** Each shows the *same* tickers ranked by
that dimension's score, with a few raw metrics specific to that dimension. Examples:

- **Technical**: `Ticker · Score · RSI · MACD · MA50/MA200 · Trade`
- **Fundamental**: `Ticker · Score · P/E · EPS growth · Profit margin · Trade`
- **Sentiment**: `Ticker · Score · News count · Avg sentiment · Trade`
- **Price**: `Ticker · Score · 1d % · 5d % · 30d % · Trade`
- **Volatility**: `Ticker · Score · 30d σ · ATR · Beta · Trade`

(Exact metrics per dimension to be finalized when the rating endpoint is built — depends on
what's in the analysis-service collections today.)

Every row in every table opens the `OrderDrawer` on click.

### 4. Dashboard composite-score column (extension)

Add one column to the existing Open Positions table in
`frontend/src/components/v4/dashboard-cards.tsx`:

| Symbol | Qty | Entry | Current | Market value | P&L | % | **Rating** |
|--------|-----|-------|---------|--------------|-----|---|------------|

The Rating cell shows the composite score as a small badge (color: green ≥75, amber 50–74,
red <50). Tooltip on hover shows the 5-dimension breakdown. Row click opens the
`OrderDrawer`. Add a small "View full ratings →" link in the section header that routes to
`/analysis/ratings#<symbol>`.

### 5. Backend: `GET /api/v1/ratings` (new endpoint)

Returns one row per ticker. Reads from existing analysis collections in MongoDB, normalizes
each dimension to 0–100, computes composite as the equal-weighted average of the five.

```ts
// response shape
type RatingRow = {
  ticker: string;
  composite: number;          // 0..100
  scores: {
    technical: number;        // 0..100
    fundamental: number;
    sentiment: number;
    price: number;
    volatility: number;
  };
  metrics: {
    technical?:   { rsi?: number; macd?: number; ma50?: number; ma200?: number };
    fundamental?: { pe?: number; epsGrowth?: number; profitMargin?: number };
    sentiment?:   { newsCount?: number; avgScore?: number };
    price?:       { d1Pct?: number; d5Pct?: number; d30Pct?: number };
    volatility?:  { sigma30d?: number; atr?: number; beta?: number };
  };
  asOf: string;               // ISO timestamp of the underlying analysis run
};
```

Normalization rules per dimension are defined in the analysis service (out of scope here — a
to-do for the implementation plan). Equal weights for v1, hardcoded constant.

### 6. Backend: `POST /api/v1/trade/order` (new endpoint)

Per-ticker order. Lives in `backend/src/trade/trade-controller.ts` next to the existing
engine-flow endpoint.

```ts
// request body
type OrderRequest = {
  email: string;              // existing auth pattern
  symbol: string;
  side: 'buy' | 'sell';
  qty?: number;               // exactly one of qty / notional required
  notional?: number;          // dollars; backend converts to fractional shares
  orderType: 'market' | 'limit';
  limitPrice?: number;        // required iff orderType === 'limit'
  timeInForce: 'day' | 'gtc';
  isLiveTrading: boolean;
  stopLossPct?: number;       // optional; if either is set, places bracket order
  takeProfitPct?: number;
};
```

Validation: symbol exists in the loaded ticker set; qty/notional XOR; limitPrice present iff
limit; buying-power check before submit. On bracket, build the Alpaca `order_class: 'bracket'`
payload from the percentages; otherwise fall through to `placeSimpleOrder`.

### 7. Backend: extend `POST /api/v1/trade/` (engine flow)

Existing endpoint, extended payload:

```ts
type EngineRequest = {
  email: string;
  amount: number;
  isLiveTrading: boolean;
  isSentimentEnabled: boolean;

  // new
  dryRun?: boolean;                  // step 2 preview
  direction?: 'long' | 'short' | 'both';
  skipHeld?: boolean;
  caps: {
    maxPositionPct: number;          // default 20
    perPositionStopLossPct: number;  // default 3
    perPositionTakeProfitPct: number;// default 5
    maxDrawdownPct: number;          // default 10 — account-level guard
  };
};
```

When `dryRun: true`, return the same shape as a real run minus actual order placement —
the planned `[{ ticker, side, composite, topSignals, allocation, qty }]` list. When false,
place orders as bracket orders using the per-position stop/target. Replace the hardcoded
`0.99 / 1.03` in `monitorAndManagePositions` with values stored on the order at creation
time (so each position uses *its* configured stop/target, not a global one).

## Data flow

**Engine flow:**
1. User configures step 1 → click `Preview picks`
2. Frontend POST `/api/v1/trade/?dryRun=true` with full payload
3. Backend runs `executeTrades` in dry-run mode (no Alpaca calls), returns plan
4. Frontend renders preview table
5. User clicks `Place N orders` → frontend POST same endpoint with `dryRun: false`
6. Backend places bracket orders via Alpaca, returns the order results
7. Frontend renders result panel

**Per-ticker order:**
1. User clicks ticker row → drawer opens with symbol prefilled
2. Drawer fetches current price + buying power on open (and polls price every 5s)
3. User fills fields → click `Review Buy …`
4. Drawer enters review state showing the recap
5. Click `Confirm` → POST `/api/v1/trade/order`
6. Backend validates, places order (bracket if stop/target set), returns result
7. Drawer renders success/error inline

**Ratings page:**
1. Page mount → GET `/api/v1/ratings`
2. Render composite table + 5 dimension tables from the same payload
3. Row click → OrderDrawer with that symbol

## Error handling

- **Drawer**: validation errors are inline per field. Network errors and Alpaca rejections
  show in a single `Alert` at the bottom of the drawer with the raw message and a `Try again`
  button. The form stays populated.
- **Engine preview**: if dry-run returns zero candidates (e.g. all filtered out), the preview
  table renders an empty state explaining why ("No tickers passed the filters: try widening
  direction or disabling Skip held").
- **Engine execute**: per-order errors don't abort the batch — each order's status is shown
  individually in step 4.
- **Ratings page**: if the endpoint fails, show a single page-level error with retry. If a
  per-row metric is missing, render `—` rather than hiding the row.

## Testing

- **Backend**: unit-test the new ratings endpoint normalization (golden-file: known scores in
  → known composite out). Unit-test order validation (qty XOR notional, limit needs price,
  bracket builds the right payload). Integration test the dry-run path returns same shape
  as live without placing orders.
- **Frontend**: component tests for `OrderDrawer` (validation, dollar↔shares conversion, live
  cost preview math, bracket preview math). Component test for the composite-column tooltip
  on dashboard. Snapshot test the engine preview table render.
- **Manual**: full round-trip in paper mode for both flows before merging.

## Open questions for implementation

(For the planning step — not blockers for spec approval.)

- Does a real-time price socket exist, or is polling the only option for the drawer's live
  price? Affects the "every 5s" choice.
- What's already in the MongoDB analysis collections — can we derive all five dimension
  scores today, or do some need new computation? Affects the rating-endpoint scope.
- Where should the order-drawer state live (zustand store vs context)? Pick whichever the
  project already uses; if neither, default to context.

## Out of scope (explicit)

- Tunable composite weights
- Stop / Stop-Limit / IOC / FOK order types
- Extended-hours trading
- Modifying or cancelling a live bracket order from the UI
- Push notifications on stop/target hits
- Backtesting UI for the engine flow
