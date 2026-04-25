# App improvements implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-ticker order drawer (Buy/Sell with qty + market/limit + optional stop/target), a `/analysis/ratings` page (one composite table + five dimension tables), a composite-score column on the dashboard, and a 4-step engine flow on `/trade` (Configure → Preview → Execute → Result) with risk caps.

**Architecture:** Backend gets a new `GET /api/v1/ratings` endpoint (rolls up MongoDB analysis collections to 0–100 scores) and a new `POST /api/v1/trade/order` endpoint for per-ticker orders (supports bracket orders for stop/target). The existing `POST /api/v1/trade/` is extended with `dryRun` + caps so the same endpoint serves Step-2 preview and Step-3 execute. Frontend introduces a global `OrderDrawer` (shadcn `Sheet`) backed by a zustand store; any ticker row anywhere opens it. The current `TradePanel` is replaced by a 4-step state machine.

**Tech Stack:** Backend — Express + TypeScript + Jest + ts-jest + supertest, MongoDB, Alpaca REST, Bottleneck. Frontend — Next.js 14 (App Router), shadcn/ui (Sheet, Tooltip, Collapsible already present), Tailwind, zustand (already a dep), Clerk auth, fetch.

**Reference spec:** `docs/superpowers/specs/2026-04-25-app-improvements-design.md`

**Testing approach:** Backend ships unit + supertest integration tests (Jest is installed; we add a minimal config). The frontend has **no test framework today**; rather than scope-creep an entire RTL/Vitest setup, frontend tasks use **manual verification via `next dev`** with a documented checklist per task. This matches the spec's "Manual: full round-trip in paper mode for both flows before merging."

**Build order:** Backend first (ratings endpoint, order endpoint, engine extensions), then frontend leaves (OrderDrawer + zustand store), then frontend pages (Ratings, Engine redesign, Dashboard column, Trade buttons on analysis charts).

---

## File structure (created or modified)

### Backend

| Path | Action | Responsibility |
|---|---|---|
| `backend/jest.config.js` | Create | Minimal ts-jest config so tests run |
| `backend/src/ratings/ratings-types.ts` | Create | `RatingRow`, dimension constants |
| `backend/src/ratings/ratings-service.ts` | Create | Reads analysis collections, normalizes to 0–100, computes composite |
| `backend/src/ratings/ratings-controller.ts` | Create | HTTP handler for `GET /ratings` |
| `backend/src/ratings/ratings-router.ts` | Create | Wires controller |
| `backend/src/ratings/__tests__/ratings-service.test.ts` | Create | Normalization & composite math |
| `backend/src/index.ts` | Modify | Mount ratings router under `/api/v1/` |
| `backend/src/trade/trade-types.ts` | Create | `OrderRequest`, `EngineRequest`, `EngineCaps`, `EnginePreview` |
| `backend/src/trade/trade-multiuser-service.ts` | Modify | Add `placeOrder()`, `previewTrades()`; extend `executeTrades()` for caps + bracket; replace hardcoded 0.99/1.03 with per-position values stored in Mongo |
| `backend/src/trade/trade-controller.ts` | Modify | Add `placeOrder` handler; update `executeTrades` handler for `dryRun` + caps |
| `backend/src/trade/trade-router.ts` | Modify | Add `POST /trade/order` |
| `backend/src/trade/__tests__/trade-controller.test.ts` | Create | Validation + dryRun shape via supertest |
| `backend/src/trade/__tests__/bracket.test.ts` | Create | Bracket-order payload assembly |

### Frontend

| Path | Action | Responsibility |
|---|---|---|
| `frontend/src/lib/order-drawer-store.ts` | Create | Zustand store: `{ symbol, isOpen, open(symbol), close() }` |
| `frontend/src/lib/api/orders.ts` | Create | `placeOrder(req)` fetcher |
| `frontend/src/lib/api/ratings.ts` | Create | `getRatings()` fetcher + `RatingRow` type |
| `frontend/src/lib/api/engine.ts` | Create | `previewEngine()` + `executeEngine()` fetchers |
| `frontend/src/components/v4/order-drawer/order-drawer.tsx` | Create | Top-level Sheet, switches between form/review/result |
| `frontend/src/components/v4/order-drawer/order-form.tsx` | Create | All input fields, live cost preview |
| `frontend/src/components/v4/order-drawer/risk-controls.tsx` | Create | Collapsible stop/target with preview line |
| `frontend/src/components/v4/order-drawer/order-review.tsx` | Create | Recap state with Confirm |
| `frontend/src/components/v4/order-drawer/order-result.tsx` | Create | Success/error state |
| `frontend/src/components/v4/ratings/dimension-table.tsx` | Create | Generic sortable table for one dimension |
| `frontend/src/components/v4/ratings/composite-table.tsx` | Create | The top "all dimensions" table |
| `frontend/src/components/v4/ratings/sticky-subnav.tsx` | Create | Anchor links |
| `frontend/src/components/v4/ratings/ratings-page.tsx` | Create | Composes everything, handles fetch |
| `frontend/src/app/(front)/analysis/ratings/page.tsx` | Create | Route shell |
| `frontend/src/components/v4/trade/engine-flow.tsx` | Create | 4-step state machine (replaces `TradePanel`) |
| `frontend/src/components/v4/trade/configure-step.tsx` | Create | Step 1 form |
| `frontend/src/components/v4/trade/preview-step.tsx` | Create | Step 2 table |
| `frontend/src/components/v4/trade/result-step.tsx` | Create | Step 4 list |
| `frontend/src/app/(front)/trade/page.tsx` | Modify | Render `EngineFlow` + mount `OrderDrawer` |
| `frontend/src/app/(front)/dashboard/page.tsx` | Modify | Mount `OrderDrawer` |
| `frontend/src/components/v4/dashboard-cards.tsx` | Modify | Composite column + tooltip + row click + "View full ratings" link |
| `frontend/src/app/(front)/analysis/{technical,fundamental,sentiment,price,volatility}/page.tsx` × 5 | Modify | Add a "Trade" button in each page header that opens drawer with that symbol — currently no symbol context, so fall back to a small symbol picker (see Task 14) |

---

## Task 0: Backend Jest config + smoke test

**Files:**
- Create: `backend/jest.config.js`
- Create: `backend/src/__tests__/smoke.test.ts`

- [ ] **Step 1: Create the Jest config**

`backend/jest.config.js`:

```js
/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  clearMocks: true,
};
```

- [ ] **Step 2: Write a smoke test**

`backend/src/__tests__/smoke.test.ts`:

```ts
describe("smoke", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 3: Run it**

```
cd backend && yarn jest --runInBand
```

Expected: `Tests: 1 passed`.

- [ ] **Step 4: Commit**

```
git add backend/jest.config.js backend/src/__tests__/smoke.test.ts
git commit -m "test(backend): add jest config + smoke test"
```

---

## Task 1: Ratings types + service skeleton (TDD: composite math)

**Files:**
- Create: `backend/src/ratings/ratings-types.ts`
- Create: `backend/src/ratings/ratings-service.ts`
- Create: `backend/src/ratings/__tests__/ratings-service.test.ts`

- [ ] **Step 1: Define the types**

`backend/src/ratings/ratings-types.ts`:

```ts
export const DIMENSIONS = [
  "technical",
  "fundamental",
  "sentiment",
  "price",
  "volatility",
] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export type DimensionScores = Record<Dimension, number>; // each 0..100

export interface RatingRow {
  ticker: string;
  composite: number; // 0..100
  scores: DimensionScores;
  metrics: Partial<{
    technical: { rsi?: number; macd?: number; ma50?: number; ma200?: number };
    fundamental: { pe?: number; epsGrowth?: number; profitMargin?: number };
    sentiment: { newsCount?: number; avgScore?: number };
    price: { d1Pct?: number; d5Pct?: number; d30Pct?: number };
    volatility: { sigma30d?: number; atr?: number; beta?: number };
  }>;
  asOf: string; // ISO
}
```

- [ ] **Step 2: Write the failing test for composite math**

`backend/src/ratings/__tests__/ratings-service.test.ts`:

```ts
import { computeComposite } from "../ratings-service";

describe("computeComposite", () => {
  it("equal-weights five 0-100 scores", () => {
    expect(
      computeComposite({
        technical: 90,
        fundamental: 80,
        sentiment: 70,
        price: 60,
        volatility: 50,
      })
    ).toBe(70);
  });

  it("clamps inputs to [0,100]", () => {
    expect(
      computeComposite({
        technical: 200,
        fundamental: -10,
        sentiment: 50,
        price: 50,
        volatility: 50,
      })
    ).toBe(50); // clamped: (100 + 0 + 50 + 50 + 50) / 5
  });

  it("rounds to nearest integer", () => {
    expect(
      computeComposite({
        technical: 81,
        fundamental: 81,
        sentiment: 81,
        price: 81,
        volatility: 80,
      })
    ).toBe(81); // 80.8 → 81
  });
});
```

- [ ] **Step 3: Run test — should fail with "cannot find module"**

```
cd backend && yarn jest ratings-service --runInBand
```

- [ ] **Step 4: Implement minimal `ratings-service.ts`**

`backend/src/ratings/ratings-service.ts`:

```ts
import { Db } from "mongodb";
import { DIMENSIONS, Dimension, DimensionScores, RatingRow } from "./ratings-types";

const clamp01 = (n: number): number => Math.max(0, Math.min(100, n));

export function computeComposite(scores: DimensionScores): number {
  const sum = DIMENSIONS.reduce((acc, d) => acc + clamp01(scores[d]), 0);
  return Math.round(sum / DIMENSIONS.length);
}

export class RatingsService {
  constructor(private db: Db) {}

  async getAll(): Promise<RatingRow[]> {
    // Implemented in Task 2
    return [];
  }
}
```

- [ ] **Step 5: Run tests — should pass**

```
cd backend && yarn jest ratings-service --runInBand
```

- [ ] **Step 6: Commit**

```
git add backend/src/ratings
git commit -m "feat(ratings): types + composite-score helper with tests"
```

---

## Task 2: Ratings service — read MongoDB and normalize

**Files:**
- Modify: `backend/src/ratings/ratings-service.ts`
- Modify: `backend/src/ratings/__tests__/ratings-service.test.ts`

**Important context for the implementer:** Inspect the existing analysis collections before writing the read code. Run a one-off script (or use Mongo Compass) to print the shape of one document from each collection used by `analysis-service.ts`. The writer should map known fields → 0–100 normalized scores using the rules below. If a field is missing on a document, leave it `undefined` in `metrics` and use a neutral 50 for that dimension.

- [ ] **Step 1: Discover the existing collection shapes**

Run from `backend/`:

```
node -e "
const { MongoClient } = require('mongodb');
const uri = process.env.MONGO_URI;
(async () => {
  const c = new MongoClient(uri); await c.connect();
  const db = c.db();
  const cols = await db.listCollections().toArray();
  console.log('collections:', cols.map(c => c.name));
  for (const name of cols.map(c => c.name)) {
    const doc = await db.collection(name).findOne({});
    console.log('\n---', name, '---');
    console.log(JSON.stringify(doc, null, 2));
  }
  await c.close();
})();
"
```

Record which collections feed which dimension. Note the field names. (Stash this in a comment in the service.)

- [ ] **Step 2: Write failing tests for normalizers**

Append to `backend/src/ratings/__tests__/ratings-service.test.ts`:

```ts
import { normalizeRsi, normalizePe, normalizeSentimentRaw } from "../ratings-service";

describe("normalizers", () => {
  it("RSI 50 → 100 (best), 0 or 100 → 0 (worst, overbought/oversold)", () => {
    expect(normalizeRsi(50)).toBe(100);
    expect(normalizeRsi(0)).toBe(0);
    expect(normalizeRsi(100)).toBe(0);
    expect(normalizeRsi(75)).toBe(50);
  });

  it("P/E: 15 maps to 100; >50 maps near 0; <0 (loss) → 0", () => {
    expect(normalizePe(15)).toBe(100);
    expect(normalizePe(60)).toBeLessThan(20);
    expect(normalizePe(-5)).toBe(0);
  });

  it("sentiment raw [-1, 1] → [0, 100]", () => {
    expect(normalizeSentimentRaw(-1)).toBe(0);
    expect(normalizeSentimentRaw(0)).toBe(50);
    expect(normalizeSentimentRaw(1)).toBe(100);
  });
});
```

- [ ] **Step 3: Run tests — should fail (functions don't exist)**

```
cd backend && yarn jest ratings-service --runInBand
```

- [ ] **Step 4: Implement normalizers + getAll**

Replace `backend/src/ratings/ratings-service.ts` with (keep `clamp01` and `computeComposite` from Task 1):

```ts
import { Db } from "mongodb";
import {
  DIMENSIONS,
  Dimension,
  DimensionScores,
  RatingRow,
} from "./ratings-types";

const clamp01 = (n: number): number => Math.max(0, Math.min(100, n));

export function computeComposite(scores: DimensionScores): number {
  const sum = DIMENSIONS.reduce((acc, d) => acc + clamp01(scores[d]), 0);
  return Math.round(sum / DIMENSIONS.length);
}

// RSI: 50 is ideal, 0 or 100 are extreme. Triangle around 50.
export function normalizeRsi(rsi: number): number {
  return clamp01(100 - Math.abs(rsi - 50) * 2);
}

// P/E: 15 ≈ ideal. Bell-ish: <0 → 0, 15 → 100, decays for high P/E.
export function normalizePe(pe: number): number {
  if (pe <= 0) return 0;
  // 100 at 15, drops linearly to 0 at 65
  return clamp01(100 - Math.abs(pe - 15) * 2);
}

// Sentiment compound score in [-1, 1].
export function normalizeSentimentRaw(s: number): number {
  return clamp01(((s + 1) / 2) * 100);
}

const NEUTRAL = 50;

export class RatingsService {
  constructor(private db: Db) {}

  async getAll(): Promise<RatingRow[]> {
    // ⚠ Adjust collection names to match what `analysis-service.ts` writes.
    // Replace any of these collection names if Step 1 discovered different names.
    const tickerDocs = await this.db
      .collection("technicalAnalysis")
      .find({})
      .toArray();

    const byTicker: Record<string, RatingRow> = {};

    for (const doc of tickerDocs) {
      const t = doc.ticker as string;
      if (!t) continue;
      byTicker[t] = {
        ticker: t,
        composite: 0,
        scores: {
          technical: NEUTRAL,
          fundamental: NEUTRAL,
          sentiment: NEUTRAL,
          price: NEUTRAL,
          volatility: NEUTRAL,
        },
        metrics: {},
        asOf: new Date().toISOString(),
      };

      if (typeof doc.rsi === "number") {
        byTicker[t].scores.technical = normalizeRsi(doc.rsi);
        byTicker[t].metrics.technical = {
          ...byTicker[t].metrics.technical,
          rsi: doc.rsi,
          macd: doc.macd,
          ma50: doc.ma50,
          ma200: doc.ma200,
        };
      }
    }

    // Repeat per collection for fundamental / sentiment / price / volatility,
    // following the same pattern: mutate `byTicker[t].scores[<dim>]` and
    // `byTicker[t].metrics[<dim>]`.
    // ----- fundamental -----
    const fundDocs = await this.db
      .collection("fundamentalAnalysis")
      .find({})
      .toArray();
    for (const doc of fundDocs) {
      const t = doc.ticker as string;
      if (!t || !byTicker[t]) continue;
      if (typeof doc.pe === "number") {
        byTicker[t].scores.fundamental = normalizePe(doc.pe);
        byTicker[t].metrics.fundamental = {
          pe: doc.pe,
          epsGrowth: doc.epsGrowth,
          profitMargin: doc.profitMargin,
        };
      }
    }
    // ----- sentiment -----
    const sentDocs = await this.db
      .collection("sentimentAnalysis")
      .find({})
      .toArray();
    for (const doc of sentDocs) {
      const t = doc.ticker as string;
      if (!t || !byTicker[t]) continue;
      if (typeof doc.compound === "number") {
        byTicker[t].scores.sentiment = normalizeSentimentRaw(doc.compound);
        byTicker[t].metrics.sentiment = {
          newsCount: doc.newsCount,
          avgScore: doc.compound,
        };
      }
    }
    // ----- price (rolling % change) -----
    // Map d1Pct directly: -5% → 0, 0% → 50, +5% → 100.
    const priceDocs = await this.db
      .collection("priceAnalysis")
      .find({})
      .toArray();
    for (const doc of priceDocs) {
      const t = doc.ticker as string;
      if (!t || !byTicker[t]) continue;
      if (typeof doc.d1Pct === "number") {
        byTicker[t].scores.price = clamp01(50 + doc.d1Pct * 10);
        byTicker[t].metrics.price = {
          d1Pct: doc.d1Pct,
          d5Pct: doc.d5Pct,
          d30Pct: doc.d30Pct,
        };
      }
    }
    // ----- volatility (lower σ → higher score) -----
    const volDocs = await this.db
      .collection("volatilityAnalysis")
      .find({})
      .toArray();
    for (const doc of volDocs) {
      const t = doc.ticker as string;
      if (!t || !byTicker[t]) continue;
      if (typeof doc.sigma30d === "number") {
        // σ 0.10 (10%) → ~50; σ 0 → 100; σ 0.50 → 0
        byTicker[t].scores.volatility = clamp01(100 - doc.sigma30d * 200);
        byTicker[t].metrics.volatility = {
          sigma30d: doc.sigma30d,
          atr: doc.atr,
          beta: doc.beta,
        };
      }
    }

    // Compose
    const out = Object.values(byTicker).map((row) => ({
      ...row,
      composite: computeComposite(row.scores),
    }));
    return out.sort((a, b) => b.composite - a.composite);
  }
}
```

> If Step 1 revealed different field names or different collections, adjust each `db.collection(...)` and `doc.<field>` accordingly. Do **not** invent fields — leave normalized score at NEUTRAL and `metrics.<dim>` undefined when the source data isn't there.

- [ ] **Step 5: Run tests**

```
cd backend && yarn jest ratings-service --runInBand
```

Expected: all green.

- [ ] **Step 6: Commit**

```
git add backend/src/ratings
git commit -m "feat(ratings): normalize per-dimension scores from analysis collections"
```

---

## Task 3: Ratings controller + router + wiring

**Files:**
- Create: `backend/src/ratings/ratings-controller.ts`
- Create: `backend/src/ratings/ratings-router.ts`
- Create: `backend/src/ratings/__tests__/ratings-route.test.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Write the failing route integration test**

`backend/src/ratings/__tests__/ratings-route.test.ts`:

```ts
import express from "express";
import request from "supertest";
import createRatingsRouter from "../ratings-router";

const fakeDb = {
  collection: () => ({
    find: () => ({ toArray: async () => [] }),
  }),
} as any;

describe("GET /ratings", () => {
  const app = express();
  app.use(express.json());
  app.use("/api/v1", createRatingsRouter(fakeDb));

  it("returns 200 + array", async () => {
    const res = await request(app).get("/api/v1/ratings");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
```

- [ ] **Step 2: Run — fails (modules don't exist)**

```
cd backend && yarn jest ratings-route --runInBand
```

- [ ] **Step 3: Implement controller**

`backend/src/ratings/ratings-controller.ts`:

```ts
import { Request, Response } from "express";
import { RatingsService } from "./ratings-service";

export class RatingsController {
  constructor(private svc: RatingsService) {
    this.list = this.list.bind(this);
  }

  async list(_req: Request, res: Response): Promise<void> {
    try {
      const rows = await this.svc.getAll();
      res.status(200).json(rows);
    } catch (err: any) {
      console.error("ratings list error", err);
      res.status(500).json({ error: err.message });
    }
  }
}
```

- [ ] **Step 4: Implement router**

`backend/src/ratings/ratings-router.ts`:

```ts
import { Router } from "express";
import { Db } from "mongodb";
import { RatingsService } from "./ratings-service";
import { RatingsController } from "./ratings-controller";

export default function createRatingsRouter(db: Db): Router {
  const router = Router();
  const svc = new RatingsService(db);
  const ctrl = new RatingsController(svc);
  router.get("/ratings", ctrl.list);
  return router;
}
```

- [ ] **Step 5: Mount router in index**

In `backend/src/index.ts`, after the `tradeRouter` registration, add:

```ts
import createRatingsRouter from './ratings/ratings-router';
// ...
const ratingsRouter = createRatingsRouter(db);
app.use('/api/v1/', ratingsRouter);
```

- [ ] **Step 6: Run tests + smoke the live endpoint**

```
cd backend && yarn jest --runInBand
```

Then in a separate shell:

```
yarn start:dev
curl http://localhost:8000/api/v1/ratings | head -c 500
```

Expected: 200 with a JSON array. (Empty `[]` is fine — confirms wiring; data lights up once analysis collections are populated.)

- [ ] **Step 7: Commit**

```
git add backend/src/ratings backend/src/index.ts
git commit -m "feat(ratings): GET /api/v1/ratings endpoint"
```

---

## Task 4: Trade types (shared) + per-ticker order endpoint

**Files:**
- Create: `backend/src/trade/trade-types.ts`
- Modify: `backend/src/trade/trade-multiuser-service.ts`
- Modify: `backend/src/trade/trade-controller.ts`
- Modify: `backend/src/trade/trade-router.ts`
- Create: `backend/src/trade/__tests__/order-validation.test.ts`

- [ ] **Step 1: Define shared types**

`backend/src/trade/trade-types.ts`:

```ts
export interface OrderRequest {
  email: string;
  symbol: string;
  side: "buy" | "sell";
  qty?: number;        // exactly one of qty / notional
  notional?: number;
  orderType: "market" | "limit";
  limitPrice?: number; // required iff orderType === 'limit'
  timeInForce: "day" | "gtc";
  isLiveTrading: boolean;
  stopLossPct?: number;   // % > 0 (e.g. 3 means -3%)
  takeProfitPct?: number; // % > 0
}

export interface OrderResult {
  ok: boolean;
  orderId?: string;
  status?: string;
  error?: string;
}

export interface EngineCaps {
  maxPositionPct: number;
  maxPositions: number;
  perPositionStopLossPct: number;
  perPositionTakeProfitPct: number;
  maxDrawdownPct: number;
}

export const DEFAULT_CAPS: EngineCaps = {
  maxPositionPct: 20,
  maxPositions: 10,
  perPositionStopLossPct: 3,
  perPositionTakeProfitPct: 5,
  maxDrawdownPct: 10,
};

export interface EngineRequest {
  email: string;
  amount: number;
  isLiveTrading: boolean;
  isSentimentEnabled: boolean;
  dryRun?: boolean;
  direction?: "long" | "short" | "both"; // default 'long'
  skipHeld?: boolean;                    // default true
  caps?: Partial<EngineCaps>;
}

export interface EnginePreviewRow {
  ticker: string;
  side: "buy" | "sell";
  composite: number;
  topSignals: string[];   // e.g. ["Tech 90", "Sent 86"]
  allocation: number;     // dollars
  qty: number;            // shares
  price: number;
}

export interface EnginePreview {
  rows: EnginePreviewRow[];
  totalAllocated: number;
  totalRequested: number;
  caps: EngineCaps;
}

export function validateOrderRequest(req: Partial<OrderRequest>): string | null {
  if (!req.email) return "email is required";
  if (!req.symbol) return "symbol is required";
  if (req.side !== "buy" && req.side !== "sell") return "side must be buy or sell";
  const hasQty = typeof req.qty === "number" && req.qty > 0;
  const hasNotional = typeof req.notional === "number" && req.notional > 0;
  if (hasQty === hasNotional) return "exactly one of qty or notional is required";
  if (req.orderType !== "market" && req.orderType !== "limit") return "orderType invalid";
  if (req.orderType === "limit" && !(typeof req.limitPrice === "number" && req.limitPrice > 0))
    return "limitPrice required for limit orders";
  if (req.timeInForce !== "day" && req.timeInForce !== "gtc") return "timeInForce invalid";
  if (req.stopLossPct != null && req.stopLossPct <= 0) return "stopLossPct must be > 0";
  if (req.takeProfitPct != null && req.takeProfitPct <= 0) return "takeProfitPct must be > 0";
  return null;
}
```

- [ ] **Step 2: Write failing validation tests**

`backend/src/trade/__tests__/order-validation.test.ts`:

```ts
import { validateOrderRequest } from "../trade-types";

describe("validateOrderRequest", () => {
  const base = {
    email: "u@x.com",
    symbol: "NVDA",
    side: "buy" as const,
    orderType: "market" as const,
    timeInForce: "day" as const,
    isLiveTrading: false,
  };

  it("requires exactly one of qty or notional", () => {
    expect(validateOrderRequest({ ...base })).toMatch(/exactly one/);
    expect(validateOrderRequest({ ...base, qty: 1, notional: 100 })).toMatch(/exactly one/);
    expect(validateOrderRequest({ ...base, qty: 1 })).toBeNull();
    expect(validateOrderRequest({ ...base, notional: 100 })).toBeNull();
  });

  it("limit needs limitPrice", () => {
    expect(
      validateOrderRequest({ ...base, qty: 1, orderType: "limit" })
    ).toMatch(/limitPrice required/);
    expect(
      validateOrderRequest({ ...base, qty: 1, orderType: "limit", limitPrice: 100 })
    ).toBeNull();
  });

  it("rejects negative stop/target", () => {
    expect(
      validateOrderRequest({ ...base, qty: 1, stopLossPct: -1 })
    ).toMatch(/stopLossPct/);
  });
});
```

- [ ] **Step 3: Run — should pass (validator already implemented in Step 1)**

```
cd backend && yarn jest order-validation --runInBand
```

- [ ] **Step 4: Add `placeOrder` to `trade-multiuser-service.ts`**

Add this method to the `TradeService` class (after `placeSimpleOrder`):

```ts
public async placeOrder(req: import("./trade-types").OrderRequest):
  Promise<import("./trade-types").OrderResult> {
  const accessToken = await this.getAccessToken(req.email);
  if (!accessToken) return { ok: false, error: "Access token is missing" };

  const apiUrl = this.getApiBaseUrl(req.isLiveTrading);

  // resolve quantity
  let qty = req.qty;
  let referencePrice: number | null = null;
  if (qty == null && req.notional != null) {
    referencePrice = await this.getLatestPrice(req.symbol, req.email, req.isLiveTrading);
    qty = parseFloat((req.notional / referencePrice).toFixed(2));
  }
  if (!qty || qty <= 0) return { ok: false, error: "qty resolved to 0" };

  const wantsBracket = req.stopLossPct != null || req.takeProfitPct != null;
  const basePayload: any = {
    symbol: req.symbol,
    qty,
    side: req.side,
    type: req.orderType,
    time_in_force: req.timeInForce,
  };
  if (req.orderType === "limit") basePayload.limit_price = req.limitPrice;

  if (wantsBracket) {
    const ref =
      referencePrice ??
      (req.orderType === "limit"
        ? req.limitPrice!
        : await this.getLatestPrice(req.symbol, req.email, req.isLiveTrading));
    basePayload.order_class = "bracket";
    if (req.stopLossPct != null) {
      basePayload.stop_loss = {
        stop_price: +(ref * (1 - req.stopLossPct / 100)).toFixed(2),
      };
    }
    if (req.takeProfitPct != null) {
      basePayload.take_profit = {
        limit_price: +(ref * (1 + req.takeProfitPct / 100)).toFixed(2),
      };
    }
  }

  try {
    const { data } = await axios.post(`${apiUrl}/orders`, basePayload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    return { ok: true, orderId: data.id, status: data.status };
  } catch (err: any) {
    const msg = err?.response?.data?.message || err.message;
    return { ok: false, error: msg };
  }
}
```

- [ ] **Step 5: Add controller handler**

In `backend/src/trade/trade-controller.ts`:

```ts
import { validateOrderRequest, OrderRequest } from "./trade-types";

// inside class, alongside executeTrades:
public async placeOrder(req: Request, res: Response): Promise<void> {
  const body = req.body as Partial<OrderRequest>;
  const err = validateOrderRequest(body);
  if (err) { res.status(400).json({ error: err }); return; }
  const result = await this.tradeService.placeOrder(body as OrderRequest);
  res.status(result.ok ? 200 : 502).json(result);
}
```

Bind in constructor:

```ts
this.placeOrder = this.placeOrder.bind(this);
```

- [ ] **Step 6: Wire route**

In `backend/src/trade/trade-router.ts` add:

```ts
router.post("/trade/order", tradeController.placeOrder);
```

- [ ] **Step 7: Add bracket-payload assembly test**

`backend/src/trade/__tests__/bracket.test.ts`:

```ts
import axios from "axios";
import TradeService from "../trade-multiuser-service";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("placeOrder bracket payload", () => {
  const fakeDb = {
    collection: () => ({ findOne: async () => ({ alpacaToken: "t" }) }),
  } as any;
  const svc = new TradeService(fakeDb);
  // stub price
  (svc as any).getLatestPrice = async () => 100;

  it("builds bracket with stop and take when both pcts present", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { id: "o1", status: "new" } });
    await svc.placeOrder({
      email: "u@x.com",
      symbol: "NVDA",
      side: "buy",
      qty: 2,
      orderType: "market",
      timeInForce: "day",
      isLiveTrading: false,
      stopLossPct: 3,
      takeProfitPct: 5,
    });
    const [, payload] = mockedAxios.post.mock.calls[0];
    expect(payload).toMatchObject({
      symbol: "NVDA",
      qty: 2,
      side: "buy",
      type: "market",
      order_class: "bracket",
      stop_loss: { stop_price: 97 },
      take_profit: { limit_price: 105 },
    });
  });

  it("omits order_class when neither stop nor target given", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { id: "o2", status: "new" } });
    await svc.placeOrder({
      email: "u@x.com",
      symbol: "AAPL",
      side: "buy",
      qty: 1,
      orderType: "market",
      timeInForce: "day",
      isLiveTrading: false,
    });
    const [, payload] = mockedAxios.post.mock.calls[0];
    expect(payload.order_class).toBeUndefined();
  });
});
```

- [ ] **Step 8: Run all backend tests**

```
cd backend && yarn jest --runInBand
```

Expected: green.

- [ ] **Step 9: Commit**

```
git add backend/src/trade backend/src/ratings
git commit -m "feat(trade): POST /api/v1/trade/order with optional bracket"
```

---

## Task 5: Engine extensions — dryRun + caps + bracket on engine orders

**Files:**
- Modify: `backend/src/trade/trade-multiuser-service.ts`
- Modify: `backend/src/trade/trade-controller.ts`
- Create: `backend/src/trade/__tests__/engine-preview.test.ts`

- [ ] **Step 1: Write failing test for `previewTrades`**

`backend/src/trade/__tests__/engine-preview.test.ts`:

```ts
import TradeService from "../trade-multiuser-service";
import { DEFAULT_CAPS } from "../trade-types";

describe("previewTrades", () => {
  const fakeDb = { collection: () => ({}) } as any;
  const svc = new TradeService(fakeDb);

  // stub dependencies
  (svc as any).analysisService = {
    getCandidatesFromDB: async () => ({
      longCandidates: [
        { ticker: "NVDA", sentiment: 0.9 },
        { ticker: "MSFT", sentiment: 0.8 },
        { ticker: "AAPL", sentiment: 0.7 },
      ],
      shortCandidates: [],
    }),
  };
  (svc as any).getLatestPrice = async () => 100;
  (svc as any).getAccessToken = async () => "t";
  (svc as any).getCurrentHoldings = async () => new Set<string>();

  it("respects maxPositions cap", async () => {
    const preview = await svc.previewTrades({
      email: "u@x.com",
      amount: 1000,
      isLiveTrading: false,
      isSentimentEnabled: true,
      caps: { ...DEFAULT_CAPS, maxPositions: 2 },
    });
    expect(preview.rows.length).toBe(2);
  });

  it("caps each allocation at maxPositionPct of total", async () => {
    const preview = await svc.previewTrades({
      email: "u@x.com",
      amount: 1000,
      isLiveTrading: false,
      isSentimentEnabled: true,
      caps: { ...DEFAULT_CAPS, maxPositionPct: 20, maxPositions: 10 },
    });
    for (const r of preview.rows) {
      expect(r.allocation).toBeLessThanOrEqual(200.0001);
    }
  });

  it("skips held names when skipHeld is true", async () => {
    (svc as any).getCurrentHoldings = async () => new Set(["NVDA"]);
    const preview = await svc.previewTrades({
      email: "u@x.com",
      amount: 1000,
      isLiveTrading: false,
      isSentimentEnabled: true,
      skipHeld: true,
    });
    expect(preview.rows.find((r) => r.ticker === "NVDA")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run — should fail**

```
cd backend && yarn jest engine-preview --runInBand
```

- [ ] **Step 3: Implement `previewTrades` + helper + extend `executeTrades`**

In `backend/src/trade/trade-multiuser-service.ts`, add imports and methods:

```ts
import {
  EngineRequest,
  EnginePreview,
  EnginePreviewRow,
  DEFAULT_CAPS,
  EngineCaps,
} from "./trade-types";

// inside class:
private async getCurrentHoldings(email: string, isLive: boolean): Promise<Set<string>> {
  try {
    const accessToken = await this.getAccessToken(email);
    if (!accessToken) return new Set();
    const apiUrl = this.getApiBaseUrl(isLive);
    const { data } = await axios.get(`${apiUrl}/positions`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return new Set<string>((data || []).map((p: any) => p.symbol));
  } catch {
    return new Set();
  }
}

public async previewTrades(req: EngineRequest): Promise<EnginePreview> {
  const caps: EngineCaps = { ...DEFAULT_CAPS, ...(req.caps ?? {}) };
  const direction = req.direction ?? "long";
  const skipHeld = req.skipHeld ?? true;

  const { longCandidates, shortCandidates } =
    await this.analysisService.getCandidatesFromDB();

  let pool: { ticker: string; sentiment?: number; side: "buy" | "sell" }[] = [];
  if (direction !== "short")
    pool.push(...longCandidates.map((c: any) => ({ ...c, side: "buy" as const })));
  if (direction !== "long")
    pool.push(...shortCandidates.map((c: any) => ({ ...c, side: "sell" as const })));

  if (req.isSentimentEnabled) pool = pool.filter((c) => (c.sentiment ?? 1) > 0.5);

  if (skipHeld) {
    const held = await this.getCurrentHoldings(req.email, req.isLiveTrading);
    pool = pool.filter((c) => !held.has(c.ticker));
  }

  pool = pool.slice(0, caps.maxPositions);

  const evenAlloc = pool.length ? req.amount / pool.length : 0;
  const maxPerPos = (caps.maxPositionPct / 100) * req.amount;
  const perPosAlloc = Math.min(evenAlloc, maxPerPos);

  const rows: EnginePreviewRow[] = [];
  for (const c of pool) {
    const price = await this.getLatestPrice(c.ticker, req.email, req.isLiveTrading);
    const qty = parseFloat((perPosAlloc / price).toFixed(2));
    rows.push({
      ticker: c.ticker,
      side: c.side,
      composite: 0, // populated by ratings join in Task 6 (frontend can also re-fetch)
      topSignals: c.sentiment != null ? [`Sent ${Math.round(c.sentiment * 100)}`] : [],
      allocation: +(qty * price).toFixed(2),
      qty,
      price,
    });
  }
  return {
    rows,
    totalAllocated: +rows.reduce((s, r) => s + r.allocation, 0).toFixed(2),
    totalRequested: req.amount,
    caps,
  };
}
```

Then **replace** the existing `executeTrades` with one that consumes the preview and places bracket orders:

```ts
public async executeTrades(
  amount: string | number,
  email: string,
  isLive: boolean,
  isSentimentEnabled: boolean,
  caps: Partial<EngineCaps> = {},
  direction: "long" | "short" | "both" = "long",
  skipHeld = true,
  dryRun = false
): Promise<{ preview: EnginePreview; results: any[] }> {
  const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (!dryRun) await this.checkAccountBalance(email, numericAmount, isLive);

  const preview = await this.previewTrades({
    email,
    amount: numericAmount,
    isLiveTrading: isLive,
    isSentimentEnabled,
    caps,
    direction,
    skipHeld,
  });

  if (dryRun) return { preview, results: [] };

  const fullCaps: EngineCaps = { ...DEFAULT_CAPS, ...caps };
  const results: any[] = [];
  for (const row of preview.rows) {
    const r = await this.placeOrder({
      email,
      symbol: row.ticker,
      side: row.side,
      notional: row.allocation,
      orderType: "market",
      timeInForce: "day",
      isLiveTrading: isLive,
      stopLossPct: fullCaps.perPositionStopLossPct,
      takeProfitPct: fullCaps.perPositionTakeProfitPct,
    });
    results.push({ ticker: row.ticker, ...r });
  }
  await this.startQstash(email, isLive);
  return { preview, results };
}
```

- [ ] **Step 4: Update controller**

Replace `executeTrades` handler in `trade-controller.ts`:

```ts
public async executeTrades(req: Request, res: Response): Promise<void> {
  try {
    const {
      amount, email, isLiveTrading, isSentimentEnabled,
      caps, direction, skipHeld, dryRun,
    } = req.body;

    if (!amount || !email) {
      res.status(400).json({ error: "Amount and email are required" });
      return;
    }

    const out = await this.tradeService.executeTrades(
      amount, email, !!isLiveTrading, !!isSentimentEnabled,
      caps ?? {}, direction ?? "long", skipHeld ?? true, !!dryRun
    );
    res.status(200).json(out);
  } catch (error: any) {
    console.error("Error executing trades:", error);
    res.status(500).json({ error: error.message });
  }
}
```

- [ ] **Step 5: Run all backend tests**

```
cd backend && yarn jest --runInBand
```

Expected: green.

- [ ] **Step 6: Manual smoke**

Start the backend and POST a dryRun:

```
curl -s -X POST http://localhost:8000/api/v1/trade -H 'Content-Type: application/json' \
  -d '{"email":"YOUR_TEST_EMAIL","amount":100,"isLiveTrading":false,"isSentimentEnabled":false,"dryRun":true}'
```

Expected: `{"preview":{"rows":[...], "totalAllocated":..., ...}, "results":[]}`. No actual orders placed.

- [ ] **Step 7: Commit**

```
git add backend/src/trade
git commit -m "feat(trade): engine dryRun + caps + bracket orders"
```

---

## Task 6: Frontend — order drawer store + API client

**Files:**
- Create: `frontend/src/lib/order-drawer-store.ts`
- Create: `frontend/src/lib/api/orders.ts`

- [ ] **Step 1: Create the zustand store**

`frontend/src/lib/order-drawer-store.ts`:

```ts
import { create } from "zustand";

interface OrderDrawerState {
  symbol: string | null;
  isOpen: boolean;
  open: (symbol: string) => void;
  close: () => void;
}

export const useOrderDrawer = create<OrderDrawerState>((set) => ({
  symbol: null,
  isOpen: false,
  open: (symbol) => set({ symbol, isOpen: true }),
  close: () => set({ isOpen: false }),
}));
```

- [ ] **Step 2: Create orders API client**

`frontend/src/lib/api/orders.ts`:

```ts
import { getApiUrl } from "@/lib/utils";

export interface PlaceOrderInput {
  email: string;
  symbol: string;
  side: "buy" | "sell";
  qty?: number;
  notional?: number;
  orderType: "market" | "limit";
  limitPrice?: number;
  timeInForce: "day" | "gtc";
  isLiveTrading: boolean;
  stopLossPct?: number;
  takeProfitPct?: number;
}

export interface PlaceOrderResult {
  ok: boolean;
  orderId?: string;
  status?: string;
  error?: string;
}

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const res = await fetch(`${getApiUrl()}/api/v1/trade/order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: body.error || `HTTP ${res.status}` };
  return body;
}

export async function fetchLatestPrice(
  symbol: string,
  email: string,
  isLiveTrading: boolean
): Promise<number | null> {
  try {
    const res = await fetch(`${getApiUrl()}/api/v1/price`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker: symbol, email, isLiveTrading }),
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.price ?? null;
  } catch {
    return null;
  }
}
```

> Note: the existing `/price` route is `router.get(...)`; if Express rejects a GET with a JSON body, change it to `router.post("/price", ...)` server-side at this point and re-test. (The current code uses GET-with-body which works inconsistently across HTTP clients; standardize it now while we're touching the trade router.)

- [ ] **Step 3: Verify TypeScript compiles**

```
cd frontend && yarn build
```

(If `yarn build` is too slow during dev, `npx tsc --noEmit` is enough to catch type errors.)

- [ ] **Step 4: Commit**

```
git add frontend/src/lib
git commit -m "feat(frontend): order-drawer store + order API client"
```

---

## Task 7: Frontend — OrderDrawer UI (form, risk-controls, review, result)

**Files:**
- Create: `frontend/src/components/v4/order-drawer/order-form.tsx`
- Create: `frontend/src/components/v4/order-drawer/risk-controls.tsx`
- Create: `frontend/src/components/v4/order-drawer/order-review.tsx`
- Create: `frontend/src/components/v4/order-drawer/order-result.tsx`
- Create: `frontend/src/components/v4/order-drawer/order-drawer.tsx`

- [ ] **Step 1: Create `risk-controls.tsx`**

```tsx
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
```

- [ ] **Step 2: Create `order-form.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { fetchLatestPrice, PlaceOrderInput } from "@/lib/api/orders";
import { useUser } from "@clerk/nextjs";
import { RiskControls, RiskValues } from "./risk-controls";

export interface OrderFormValues extends Omit<PlaceOrderInput, "email"> {}

const PAPER_KEY = "qt_isLiveTrading";

export function OrderForm({
  symbol, onReview,
}: {
  symbol: string;
  onReview: (vals: OrderFormValues, refPrice: number | null) => void;
}) {
  const { user } = useUser();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [unit, setUnit] = useState<"shares" | "dollars">("dollars");
  const [qtyInput, setQtyInput] = useState("100"); // default $100 notional
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [tif, setTif] = useState<"day" | "gtc">("day");
  const [isLive, setIsLive] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(PAPER_KEY) === "1";
  });
  const [risk, setRisk] = useState<RiskValues>({});
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem(PAPER_KEY, isLive ? "1" : "0");
  }, [isLive]);

  // poll price every 5s
  useEffect(() => {
    let alive = true;
    const email = user?.primaryEmailAddress?.emailAddress;
    if (!email) return;
    const tick = async () => {
      const p = await fetchLatestPrice(symbol, email, isLive);
      if (alive && p != null) setPrice(p);
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => { alive = false; clearInterval(id); };
  }, [symbol, isLive, user]);

  const numericInput = parseFloat(qtyInput) || 0;
  const resolvedQty = unit === "shares" ? numericInput : (price ? numericInput / price : 0);
  const resolvedNotional = unit === "dollars" ? numericInput : (price ? numericInput * price : 0);

  const submit = () => {
    onReview(
      {
        symbol, side, orderType, timeInForce: tif, isLiveTrading: isLive,
        ...(unit === "shares" ? { qty: numericInput } : { notional: numericInput }),
        ...(orderType === "limit" ? { limitPrice: parseFloat(limitPrice) } : {}),
        ...risk,
      },
      orderType === "limit" ? parseFloat(limitPrice) : price
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Live data</p>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-mono tabular-nums">
            {price != null ? `$${price.toFixed(2)}` : "—"}
          </span>
          <span className="text-xs text-muted-foreground">
            {isLive ? "Live" : "Paper"} · refreshes every 5s
          </span>
        </div>
      </div>

      {/* Side */}
      <div className="grid grid-cols-2 overflow-hidden rounded-md border border-border/60">
        {(["buy", "sell"] as const).map((s) => (
          <button key={s} onClick={() => setSide(s)}
            className={`py-2 text-sm font-medium uppercase tracking-wide ${side === s ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Quantity */}
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <Label htmlFor="qty">Quantity</Label>
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => setUnit(unit === "shares" ? "dollars" : "shares")}
          >
            in {unit} · switch to {unit === "shares" ? "dollars" : "shares"}
          </button>
        </div>
        <Input id="qty" type="number" min={0} step={0.01} value={qtyInput}
          onChange={(e) => setQtyInput(e.target.value)} />
        {price != null && (
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">
            ≈ {resolvedQty.toFixed(4)} shares · ${resolvedNotional.toFixed(2)}
          </p>
        )}
      </div>

      {/* Order type */}
      <div className="grid grid-cols-2 overflow-hidden rounded-md border border-border/60">
        {(["market", "limit"] as const).map((t) => (
          <button key={t} onClick={() => setOrderType(t)}
            className={`py-2 text-sm font-medium uppercase tracking-wide ${orderType === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {t}
          </button>
        ))}
      </div>
      {orderType === "limit" && (
        <div>
          <Label htmlFor="lp">Limit price</Label>
          <Input id="lp" type="number" min={0} step={0.01} value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)} />
        </div>
      )}

      {/* Time in force */}
      <div className="grid grid-cols-2 overflow-hidden rounded-md border border-border/60">
        {(["day", "gtc"] as const).map((t) => (
          <button key={t} onClick={() => setTif(t)}
            className={`py-2 text-sm font-medium uppercase tracking-wide ${tif === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Live/Paper */}
      <div className="flex items-center justify-between border-t border-border/40 pt-4">
        <Label>Live trading</Label>
        <Switch checked={isLive} onCheckedChange={setIsLive} />
      </div>

      <RiskControls value={risk} onChange={setRisk} referencePrice={price} />

      <Button className="h-12 w-full" disabled={!numericInput || (orderType === "limit" && !limitPrice)}
        onClick={submit}>
        Review {side} {symbol}
        {price != null && unit === "shares" && ` · ~$${(numericInput * price).toFixed(2)}`}
        {price != null && unit === "dollars" && ` · ~${(numericInput / price).toFixed(2)} sh`}
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Create `order-review.tsx`**

```tsx
"use client";
import { Button } from "@/components/ui/button";
import { OrderFormValues } from "./order-form";

export function OrderReview({
  values, referencePrice, onConfirm, onBack, loading,
}: {
  values: OrderFormValues;
  referencePrice: number | null;
  onConfirm: () => void;
  onBack: () => void;
  loading: boolean;
}) {
  const stopAt = referencePrice && values.stopLossPct
    ? referencePrice * (1 - values.stopLossPct / 100) : null;
  const tpAt = referencePrice && values.takeProfitPct
    ? referencePrice * (1 + values.takeProfitPct / 100) : null;

  const Row = ({ k, v }: { k: string; v: string }) => (
    <div className="flex items-baseline justify-between border-t border-border/30 py-2 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono tabular-nums">{v}</span>
    </div>
  );

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Review order</p>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight">
        {values.side.toUpperCase()} {values.symbol}
      </h3>
      <div className="mt-4">
        {values.qty != null && <Row k="Shares" v={values.qty.toString()} />}
        {values.notional != null && <Row k="Notional" v={`$${values.notional.toFixed(2)}`} />}
        <Row k="Order type" v={values.orderType} />
        {values.orderType === "limit" && <Row k="Limit price" v={`$${values.limitPrice}`} />}
        <Row k="Time in force" v={values.timeInForce.toUpperCase()} />
        <Row k="Mode" v={values.isLiveTrading ? "Live" : "Paper"} />
        {stopAt && <Row k={`Stop-loss (−${values.stopLossPct}%)`} v={`$${stopAt.toFixed(2)}`} />}
        {tpAt && <Row k={`Take-profit (+${values.takeProfitPct}%)`} v={`$${tpAt.toFixed(2)}`} />}
      </div>
      <div className="mt-6 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onBack} disabled={loading}>
          Back
        </Button>
        <Button className="flex-1" onClick={onConfirm} disabled={loading}>
          {loading ? "Placing…" : "Confirm"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `order-result.tsx`**

```tsx
"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function OrderResult({
  ok, orderId, status, error, onClose, onAnother,
}: {
  ok: boolean;
  orderId?: string;
  status?: string;
  error?: string;
  onClose: () => void;
  onAnother: () => void;
}) {
  return (
    <div className="text-center">
      <p className={`text-xs uppercase tracking-widest ${ok ? "text-emerald-600" : "text-rose-600"}`}>
        {ok ? "Order placed" : "Order failed"}
      </p>
      <h3 className="mt-3 text-xl font-semibold">
        {ok ? `Status: ${status}` : error}
      </h3>
      {orderId && <p className="mt-1 font-mono text-xs text-muted-foreground">{orderId}</p>}
      <div className="mt-8 flex flex-col gap-3">
        <Link href="/dashboard"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={onClose}>
          View on dashboard →
        </Link>
        <Button variant="outline" onClick={onAnother}>Place another order</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `order-drawer.tsx`**

```tsx
"use client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useOrderDrawer } from "@/lib/order-drawer-store";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { OrderForm, OrderFormValues } from "./order-form";
import { OrderReview } from "./order-review";
import { OrderResult } from "./order-result";
import { placeOrder, PlaceOrderResult } from "@/lib/api/orders";

type Mode = "form" | "review" | "result";

export function OrderDrawer() {
  const { isOpen, symbol, close } = useOrderDrawer();
  const { user } = useUser();
  const [mode, setMode] = useState<Mode>("form");
  const [values, setValues] = useState<OrderFormValues | null>(null);
  const [refPrice, setRefPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlaceOrderResult | null>(null);

  const reset = () => { setMode("form"); setValues(null); setResult(null); };

  const onConfirm = async () => {
    if (!values || !user) return;
    setLoading(true);
    const email = user.primaryEmailAddress?.emailAddress!;
    const r = await placeOrder({ ...values, email });
    setResult(r);
    setMode("result");
    setLoading(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(o) => { if (!o) { close(); reset(); } }}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
        {symbol && (
          <>
            <SheetHeader>
              <SheetTitle>{symbol}</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              {mode === "form" && (
                <OrderForm
                  symbol={symbol}
                  onReview={(v, p) => { setValues(v); setRefPrice(p); setMode("review"); }}
                />
              )}
              {mode === "review" && values && (
                <OrderReview
                  values={values}
                  referencePrice={refPrice}
                  onBack={() => setMode("form")}
                  onConfirm={onConfirm}
                  loading={loading}
                />
              )}
              {mode === "result" && result && (
                <OrderResult
                  ok={result.ok}
                  orderId={result.orderId}
                  status={result.status}
                  error={result.error}
                  onClose={() => { close(); reset(); }}
                  onAnother={reset}
                />
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 6: Type-check**

```
cd frontend && npx tsc --noEmit
```

Fix any type errors. Don't commit until clean.

- [ ] **Step 7: Commit**

```
git add frontend/src/components/v4/order-drawer
git commit -m "feat(frontend): OrderDrawer (form, risk controls, review, result)"
```

---

## Task 8: Mount OrderDrawer + wire dashboard rows

**Files:**
- Modify: `frontend/src/app/(front)/dashboard/page.tsx`
- Modify: `frontend/src/app/(front)/trade/page.tsx`
- Modify: `frontend/src/components/v4/dashboard-cards.tsx`

- [ ] **Step 1: Mount drawer on dashboard page**

In `frontend/src/app/(front)/dashboard/page.tsx`, add the import and place `<OrderDrawer />` at the end of the JSX inside `ContentLayout`:

```tsx
import { OrderDrawer } from "@/components/v4/order-drawer/order-drawer";
// ...
<Dashboard />
<OrderDrawer />
```

- [ ] **Step 2: Mount drawer on trade page**

Similarly in `frontend/src/app/(front)/trade/page.tsx`, add `<OrderDrawer />` after `<LoginPrompt />`.

- [ ] **Step 3: Wire row click → open drawer (without composite column yet)**

In `frontend/src/components/v4/dashboard-cards.tsx`:

```tsx
import { useOrderDrawer } from "@/lib/order-drawer-store";
// inside Dashboard():
const openDrawer = useOrderDrawer((s) => s.open);
```

Then on each `<tr key={p.symbol} ...>` in the positions table, add `onClick={() => openDrawer(p.symbol)}` and `cursor-pointer` to its className. Same for the orders table rows on `o.symbol`.

- [ ] **Step 4: Manual verify**

```
cd frontend && yarn dev
```

Sign in, go to `/dashboard`, click a position row → drawer opens with that symbol, price polls, you can fill the form. Close the drawer with the X. Repeat from `/trade`.

- [ ] **Step 5: Commit**

```
git add frontend/src/app frontend/src/components/v4/dashboard-cards.tsx
git commit -m "feat(frontend): mount OrderDrawer on dashboard + trade; rows open it"
```

---

## Task 9: Frontend — Ratings API client + reusable table components

**Files:**
- Create: `frontend/src/lib/api/ratings.ts`
- Create: `frontend/src/components/v4/ratings/dimension-table.tsx`
- Create: `frontend/src/components/v4/ratings/composite-table.tsx`
- Create: `frontend/src/components/v4/ratings/sticky-subnav.tsx`

- [ ] **Step 1: Ratings API client**

`frontend/src/lib/api/ratings.ts`:

```ts
import { getApiUrl } from "@/lib/utils";

export const DIMENSIONS = ["technical", "fundamental", "sentiment", "price", "volatility"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export interface RatingRow {
  ticker: string;
  composite: number;
  scores: Record<Dimension, number>;
  metrics: Partial<{
    technical: { rsi?: number; macd?: number; ma50?: number; ma200?: number };
    fundamental: { pe?: number; epsGrowth?: number; profitMargin?: number };
    sentiment: { newsCount?: number; avgScore?: number };
    price: { d1Pct?: number; d5Pct?: number; d30Pct?: number };
    volatility: { sigma30d?: number; atr?: number; beta?: number };
  }>;
  asOf: string;
}

export async function getRatings(): Promise<RatingRow[]> {
  const res = await fetch(`${getApiUrl()}/api/v1/ratings`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
```

- [ ] **Step 2: Composite table**

`frontend/src/components/v4/ratings/composite-table.tsx`:

```tsx
"use client";
import { useState } from "react";
import { RatingRow, DIMENSIONS, Dimension } from "@/lib/api/ratings";
import { useOrderDrawer } from "@/lib/order-drawer-store";
import { cn } from "@/lib/utils";

const scoreClass = (n: number) =>
  n >= 75 ? "text-emerald-600" : n >= 50 ? "text-amber-600" : "text-rose-600";

type SortKey = "ticker" | "composite" | Dimension;

export function CompositeTable({ rows }: { rows: RatingRow[] }) {
  const open = useOrderDrawer((s) => s.open);
  const [sort, setSort] = useState<{ k: SortKey; dir: "asc" | "desc" }>({
    k: "composite", dir: "desc",
  });

  const sorted = [...rows].sort((a, b) => {
    const av = sort.k === "ticker" ? a.ticker
      : sort.k === "composite" ? a.composite
      : a.scores[sort.k as Dimension];
    const bv = sort.k === "ticker" ? b.ticker
      : sort.k === "composite" ? b.composite
      : b.scores[sort.k as Dimension];
    if (av < bv) return sort.dir === "asc" ? -1 : 1;
    if (av > bv) return sort.dir === "asc" ? 1 : -1;
    return 0;
  });

  const Th = ({ k, label, right }: { k: SortKey; label: string; right?: boolean }) => (
    <th className={cn("px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium",
      right && "text-right")}>
      <button onClick={() => setSort({ k, dir: sort.k === k && sort.dir === "desc" ? "asc" : "desc" })}>
        {label} {sort.k === k ? (sort.dir === "desc" ? "↓" : "↑") : ""}
      </button>
    </th>
  );

  return (
    <div id="composite" className="overflow-hidden rounded-lg border border-border/60">
      <table className="w-full table-auto">
        <thead className="bg-muted/30">
          <tr className="text-left">
            <Th k="ticker" label="Ticker" />
            <Th k="composite" label="Composite" right />
            {DIMENSIONS.map((d) => (
              <Th key={d} k={d} label={d.slice(0, 4)} right />
            ))}
            <th className="w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {sorted.map((r) => (
            <tr key={r.ticker}
              className="cursor-pointer transition-colors hover:bg-muted/30"
              onClick={() => open(r.ticker)}>
              <td className="px-4 py-3 font-medium">{r.ticker}</td>
              <td className={cn("px-4 py-3 text-right font-mono tabular-nums", scoreClass(r.composite))}>
                {r.composite}
              </td>
              {DIMENSIONS.map((d) => (
                <td key={d} className={cn("px-4 py-3 text-right font-mono tabular-nums", scoreClass(r.scores[d]))}>
                  {Math.round(r.scores[d])}
                </td>
              ))}
              <td className="px-4 py-3 text-right text-muted-foreground">→</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Generic dimension table**

`frontend/src/components/v4/ratings/dimension-table.tsx`:

```tsx
"use client";
import { useState } from "react";
import { RatingRow, Dimension } from "@/lib/api/ratings";
import { useOrderDrawer } from "@/lib/order-drawer-store";
import { cn } from "@/lib/utils";

type Col<T> = { key: string; label: string; get: (r: RatingRow) => T; format?: (v: T) => string };

const scoreClass = (n: number) =>
  n >= 75 ? "text-emerald-600" : n >= 50 ? "text-amber-600" : "text-rose-600";

const dash = (v: any, fmt?: (x: any) => string) =>
  v == null || Number.isNaN(v) ? "—" : (fmt ? fmt(v) : String(v));

export const DIMENSION_COLUMNS: Record<Dimension, Col<any>[]> = {
  technical: [
    { key: "rsi",   label: "RSI",   get: (r) => r.metrics.technical?.rsi,   format: (v) => v.toFixed(1) },
    { key: "macd",  label: "MACD",  get: (r) => r.metrics.technical?.macd,  format: (v) => v.toFixed(2) },
    { key: "ma50",  label: "MA50",  get: (r) => r.metrics.technical?.ma50,  format: (v) => v.toFixed(2) },
    { key: "ma200", label: "MA200", get: (r) => r.metrics.technical?.ma200, format: (v) => v.toFixed(2) },
  ],
  fundamental: [
    { key: "pe",           label: "P/E",        get: (r) => r.metrics.fundamental?.pe,           format: (v) => v.toFixed(1) },
    { key: "epsGrowth",    label: "EPS growth", get: (r) => r.metrics.fundamental?.epsGrowth,    format: (v) => `${(v * 100).toFixed(1)}%` },
    { key: "profitMargin", label: "Margin",     get: (r) => r.metrics.fundamental?.profitMargin, format: (v) => `${(v * 100).toFixed(1)}%` },
  ],
  sentiment: [
    { key: "newsCount", label: "News count", get: (r) => r.metrics.sentiment?.newsCount },
    { key: "avgScore",  label: "Avg score",  get: (r) => r.metrics.sentiment?.avgScore, format: (v) => v.toFixed(2) },
  ],
  price: [
    { key: "d1Pct",  label: "1d %",  get: (r) => r.metrics.price?.d1Pct,  format: (v) => `${v.toFixed(2)}%` },
    { key: "d5Pct",  label: "5d %",  get: (r) => r.metrics.price?.d5Pct,  format: (v) => `${v.toFixed(2)}%` },
    { key: "d30Pct", label: "30d %", get: (r) => r.metrics.price?.d30Pct, format: (v) => `${v.toFixed(2)}%` },
  ],
  volatility: [
    { key: "sigma30d", label: "30d σ", get: (r) => r.metrics.volatility?.sigma30d, format: (v) => v.toFixed(3) },
    { key: "atr",      label: "ATR",   get: (r) => r.metrics.volatility?.atr,      format: (v) => v.toFixed(2) },
    { key: "beta",     label: "Beta",  get: (r) => r.metrics.volatility?.beta,     format: (v) => v.toFixed(2) },
  ],
};

export function DimensionTable({ dimension, rows }: { dimension: Dimension; rows: RatingRow[] }) {
  const open = useOrderDrawer((s) => s.open);
  const [sort, setSort] = useState<{ k: string; dir: "asc" | "desc" }>({
    k: "score", dir: "desc",
  });
  const cols = DIMENSION_COLUMNS[dimension];

  const sorted = [...rows].sort((a, b) => {
    let av: any, bv: any;
    if (sort.k === "ticker") { av = a.ticker; bv = b.ticker; }
    else if (sort.k === "score") { av = a.scores[dimension]; bv = b.scores[dimension]; }
    else {
      const c = cols.find((c) => c.key === sort.k)!;
      av = c.get(a); bv = c.get(b);
      if (av == null) av = -Infinity;
      if (bv == null) bv = -Infinity;
    }
    if (av < bv) return sort.dir === "asc" ? -1 : 1;
    if (av > bv) return sort.dir === "asc" ? 1 : -1;
    return 0;
  });

  const Th = ({ k, label, right }: { k: string; label: string; right?: boolean }) => (
    <th className={cn("px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium", right && "text-right")}>
      <button onClick={() => setSort({ k, dir: sort.k === k && sort.dir === "desc" ? "asc" : "desc" })}>
        {label} {sort.k === k ? (sort.dir === "desc" ? "↓" : "↑") : ""}
      </button>
    </th>
  );

  return (
    <section id={dimension} className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold capitalize tracking-tight">{dimension}</h2>
      </div>
      <div className="overflow-hidden rounded-lg border border-border/60">
        <table className="w-full table-auto">
          <thead className="bg-muted/30">
            <tr className="text-left">
              <Th k="ticker" label="Ticker" />
              <Th k="score" label="Score" right />
              {cols.map((c) => <Th key={c.key} k={c.key} label={c.label} right />)}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {sorted.map((r) => (
              <tr key={r.ticker} className="cursor-pointer transition-colors hover:bg-muted/30"
                onClick={() => open(r.ticker)}>
                <td className="px-4 py-3 font-medium">{r.ticker}</td>
                <td className={cn("px-4 py-3 text-right font-mono tabular-nums", scoreClass(r.scores[dimension]))}>
                  {Math.round(r.scores[dimension])}
                </td>
                {cols.map((c) => (
                  <td key={c.key} className="px-4 py-3 text-right font-mono tabular-nums">
                    {dash(c.get(r), c.format)}
                  </td>
                ))}
                <td className="px-4 py-3 text-right text-muted-foreground">→</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Sticky sub-nav**

`frontend/src/components/v4/ratings/sticky-subnav.tsx`:

```tsx
"use client";
import { DIMENSIONS } from "@/lib/api/ratings";

const ITEMS = ["composite", ...DIMENSIONS] as const;

export function StickySubnav() {
  return (
    <nav className="sticky top-0 z-10 -mx-4 mb-6 flex gap-4 overflow-x-auto border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
      {ITEMS.map((id) => (
        <a key={id} href={`#${id}`} className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
          {id}
        </a>
      ))}
    </nav>
  );
}
```

- [ ] **Step 5: Type-check + commit**

```
cd frontend && npx tsc --noEmit
git add frontend/src/lib/api/ratings.ts frontend/src/components/v4/ratings
git commit -m "feat(ratings): API client + composite/dimension tables + sub-nav"
```

---

## Task 10: Ratings page

**Files:**
- Create: `frontend/src/components/v4/ratings/ratings-page.tsx`
- Create: `frontend/src/app/(front)/analysis/ratings/page.tsx`

- [ ] **Step 1: Page composer**

`frontend/src/components/v4/ratings/ratings-page.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import { CircularProgress } from "@mui/material";
import { getRatings, RatingRow, DIMENSIONS } from "@/lib/api/ratings";
import { CompositeTable } from "./composite-table";
import { DimensionTable } from "./dimension-table";
import { StickySubnav } from "./sticky-subnav";
import { OrderDrawer } from "@/components/v4/order-drawer/order-drawer";

export function RatingsPage() {
  const [rows, setRows] = useState<RatingRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getRatings()
      .then((r) => { if (alive) setRows(r); })
      .catch((e) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <p className="text-sm text-rose-600">Failed to load ratings: {error}</p>
        <button className="mt-4 text-sm underline" onClick={() => location.reload()}>
          Try again
        </button>
      </div>
    );
  }
  if (!rows) {
    return <div className="flex h-[50vh] items-center justify-center"><CircularProgress /></div>;
  }
  if (rows.length === 0) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">No ratings yet</h2>
        <p className="mt-3 text-muted-foreground">
          Run the analysis service to populate ratings.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <StickySubnav />
      <div className="space-y-12">
        <section id="composite" className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Composite</h2>
          <CompositeTable rows={rows} />
        </section>
        {DIMENSIONS.map((d) => (
          <DimensionTable key={d} dimension={d} rows={rows} />
        ))}
      </div>
      <OrderDrawer />
    </div>
  );
}
```

- [ ] **Step 2: Route shell**

`frontend/src/app/(front)/analysis/ratings/page.tsx`:

```tsx
import Link from "next/link";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { RatingsPage } from "@/components/v4/ratings/ratings-page";

export default function Page() {
  return (
    <ContentLayout title="Ratings">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink asChild><Link href="/">Home</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink asChild><Link href="/dashboard">Dashboard</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink asChild><Link href="/analysis">Analysis</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Ratings</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <RatingsPage />
    </ContentLayout>
  );
}
```

- [ ] **Step 3: Manual verify**

```
cd frontend && yarn dev
```

Visit `/analysis/ratings`. Confirm: page loads (or shows empty state if collections are empty), sub-nav anchors jump to sections, sortable columns work, clicking a row opens the OrderDrawer.

- [ ] **Step 4: Commit**

```
git add frontend/src/components/v4/ratings frontend/src/app/\(front\)/analysis/ratings
git commit -m "feat(ratings): /analysis/ratings page with composite + dimension tables"
```

---

## Task 11: Dashboard composite-score column + tooltip

**Files:**
- Modify: `frontend/src/components/v4/dashboard-cards.tsx`

- [ ] **Step 1: Fetch ratings on mount and key by ticker**

In `frontend/src/components/v4/dashboard-cards.tsx`, add to imports:

```tsx
import { getRatings, RatingRow, DIMENSIONS } from "@/lib/api/ratings";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Link from "next/link";
```

Inside the `Dashboard` component, after the existing data effect, add:

```tsx
const [ratings, setRatings] = useState<Record<string, RatingRow>>({});
useEffect(() => {
  getRatings().then((rows) => {
    const byTicker: Record<string, RatingRow> = {};
    rows.forEach((r) => { byTicker[r.ticker] = r; });
    setRatings(byTicker);
  }).catch(() => {});
}, []);
```

- [ ] **Step 2: Add Rating column header**

In the positions `<thead>`, add a new `<th>` after the `%` cell:

```tsx
<th className="hidden px-4 py-3 text-right font-medium md:table-cell">Rating</th>
```

- [ ] **Step 3: Add Rating cell with tooltip**

In each position row, after the `pct` cell, add:

```tsx
<td className="hidden px-4 py-3 text-right md:table-cell">
  <RatingCell row={ratings[p.symbol]} />
</td>
```

Define the helper at the bottom of the file:

```tsx
function RatingCell({ row }: { row: RatingRow | undefined }) {
  if (!row) return <span className="text-muted-foreground">—</span>;
  const cls =
    row.composite >= 75 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
    : row.composite >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
    : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 font-mono text-xs", cls)}>
            {row.composite}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <ul className="text-xs">
            {DIMENSIONS.map((d) => (
              <li key={d} className="flex justify-between gap-4">
                <span className="capitalize text-muted-foreground">{d}</span>
                <span className="font-mono tabular-nums">{Math.round(row.scores[d])}</span>
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

- [ ] **Step 4: Add "View full ratings" link to section header**

Replace the Open Positions section header so it includes a link:

```tsx
<div className="flex items-baseline justify-between">
  <h2 className="text-lg font-semibold tracking-tight">Open positions</h2>
  <div className="flex items-baseline gap-4">
    <Link href="/analysis/ratings" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
      View full ratings →
    </Link>
    <span className="font-mono text-xs text-muted-foreground">
      {positions.length} {positions.length === 1 ? "position" : "positions"}
    </span>
  </div>
</div>
```

- [ ] **Step 5: Manual verify**

Reload `/dashboard` while signed in with positions. Each row should show a colored composite badge; hovering it shows the 5-dimension breakdown. The "View full ratings →" link should jump to `/analysis/ratings`.

- [ ] **Step 6: Commit**

```
git add frontend/src/components/v4/dashboard-cards.tsx
git commit -m "feat(dashboard): composite-score column with breakdown tooltip"
```

---

## Task 12: Frontend — Engine flow API + Configure step

**Files:**
- Create: `frontend/src/lib/api/engine.ts`
- Create: `frontend/src/components/v4/trade/configure-step.tsx`

- [ ] **Step 1: Engine API client**

`frontend/src/lib/api/engine.ts`:

```ts
import { getApiUrl } from "@/lib/utils";

export interface EngineCaps {
  maxPositionPct: number;
  maxPositions: number;
  perPositionStopLossPct: number;
  perPositionTakeProfitPct: number;
  maxDrawdownPct: number;
}
export const DEFAULT_CAPS: EngineCaps = {
  maxPositionPct: 20, maxPositions: 10,
  perPositionStopLossPct: 3, perPositionTakeProfitPct: 5,
  maxDrawdownPct: 10,
};

export interface EngineFormState {
  amount: number;
  isLiveTrading: boolean;
  isSentimentEnabled: boolean;
  direction: "long" | "short" | "both";
  skipHeld: boolean;
  caps: EngineCaps;
}

export interface EnginePreviewRow {
  ticker: string; side: "buy" | "sell"; composite: number;
  topSignals: string[]; allocation: number; qty: number; price: number;
}
export interface EnginePreview {
  rows: EnginePreviewRow[]; totalAllocated: number; totalRequested: number; caps: EngineCaps;
}
export interface EngineExecuteResult {
  preview: EnginePreview;
  results: { ticker: string; ok: boolean; orderId?: string; status?: string; error?: string }[];
}

async function call(state: EngineFormState, email: string, dryRun: boolean) {
  const res = await fetch(`${getApiUrl()}/api/v1/trade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...state, email, dryRun }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const previewEngine = (s: EngineFormState, email: string) =>
  call(s, email, true) as Promise<EngineExecuteResult>;
export const executeEngine = (s: EngineFormState, email: string) =>
  call(s, email, false) as Promise<EngineExecuteResult>;
```

- [ ] **Step 2: Configure step**

`frontend/src/components/v4/trade/configure-step.tsx`:

```tsx
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
    <div className="mx-auto w-full max-w-3xl px-4 py-10 md:py-16">
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
          const target = availableCash ? (availableCash * pct) / 100 : pct;
          const active = Math.abs(state.amount - target) < 0.01;
          return (
            <button key={pct} type="button"
              onClick={() => set({ amount: +target.toFixed(2) })}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium ${active ? "border-primary bg-primary text-primary-foreground" : "border-border/60 text-muted-foreground hover:text-foreground"}`}>
              {pct}%
            </button>
          );
        })}
        <Input type="number" min={0} step={1}
          className="w-32 text-right"
          value={state.amount}
          onChange={(e) => set({ amount: parseFloat(e.target.value) || 0 })} />
      </div>

      {/* Risk caps */}
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

      {/* Filters */}
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
```

- [ ] **Step 3: Type-check + commit**

```
cd frontend && npx tsc --noEmit
git add frontend/src/lib/api/engine.ts frontend/src/components/v4/trade/configure-step.tsx
git commit -m "feat(engine): API client + Configure step (caps, filters, presets)"
```

---

## Task 13: Engine flow — Preview, Result, state machine, replace TradePanel

**Files:**
- Create: `frontend/src/components/v4/trade/preview-step.tsx`
- Create: `frontend/src/components/v4/trade/result-step.tsx`
- Create: `frontend/src/components/v4/trade/engine-flow.tsx`
- Modify: `frontend/src/app/(front)/trade/page.tsx`

- [ ] **Step 1: Preview step**

`frontend/src/components/v4/trade/preview-step.tsx`:

```tsx
"use client";
import { Button } from "@/components/ui/button";
import { EnginePreview } from "@/lib/api/engine";

export function PreviewStep({
  preview, stopPct, tpPct, onAdjust, onPlace, loading,
}: {
  preview: EnginePreview;
  stopPct: number;
  tpPct: number;
  onAdjust: () => void;
  onPlace: () => void;
  loading: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 md:py-16">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Preview</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Engine plan</h1>
      <p className="mt-3 text-muted-foreground">
        Review the orders the engine will place. Nothing is sent until you confirm.
      </p>

      <div className="mt-8 overflow-hidden rounded-lg border border-border/60">
        <table className="w-full table-auto">
          <thead className="bg-muted/30">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium">Ticker</th>
              <th className="px-4 py-3 font-medium">Side</th>
              <th className="px-4 py-3 text-right font-medium">Composite</th>
              <th className="px-4 py-3 font-medium">Why</th>
              <th className="px-4 py-3 text-right font-medium">Allocation</th>
              <th className="px-4 py-3 text-right font-medium">~Shares</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {preview.rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No tickers passed your filters. Try widening direction or disabling Skip held.
                </td>
              </tr>
            ) : preview.rows.map((r) => (
              <tr key={r.ticker}>
                <td className="px-4 py-3 font-medium">{r.ticker}</td>
                <td className="px-4 py-3 capitalize">{r.side}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">{r.composite || "—"}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{r.topSignals.join(" · ") || "—"}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">${r.allocation.toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">{r.qty.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 font-mono text-xs text-muted-foreground">
        Total: ${preview.totalAllocated.toFixed(2)} of ${preview.totalRequested.toFixed(2)} ·
        {" "}{preview.rows.length} positions ·
        {" "}Stop −{stopPct}% · Target +{tpPct}%
      </p>

      <div className="mt-8 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onAdjust} disabled={loading}>Adjust</Button>
        <Button className="flex-1" onClick={onPlace} disabled={loading || preview.rows.length === 0}>
          {loading ? "Placing…" : `Place ${preview.rows.length} orders`}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Result step**

`frontend/src/components/v4/trade/result-step.tsx`:

```tsx
"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { EngineExecuteResult } from "@/lib/api/engine";
import { cn } from "@/lib/utils";

export function ResultStep({ result, onAnother }: {
  result: EngineExecuteResult; onAnother: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 md:py-16">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Result</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Orders submitted</h1>
      <ul className="mt-8 divide-y divide-border/60 rounded-lg border border-border/60">
        {result.results.map((r, i) => (
          <li key={i} className="flex items-baseline justify-between px-4 py-3">
            <div>
              <div className="font-medium">{r.ticker}</div>
              <div className="font-mono text-xs text-muted-foreground">{r.orderId ?? "—"}</div>
            </div>
            <span className={cn(
              "rounded-full px-2 py-0.5 text-xs",
              r.ok ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
            )}>
              {r.ok ? r.status ?? "submitted" : (r.error ?? "failed")}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex gap-3">
        <Link href="/dashboard" className="flex-1">
          <Button variant="outline" className="w-full">View on dashboard</Button>
        </Link>
        <Button className="flex-1" onClick={onAnother}>Make another allocation</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: State machine**

`frontend/src/components/v4/trade/engine-flow.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { ConfigureStep } from "./configure-step";
import { PreviewStep } from "./preview-step";
import { ResultStep } from "./result-step";
import {
  DEFAULT_CAPS, EngineFormState, EnginePreview, EngineExecuteResult,
  previewEngine, executeEngine,
} from "@/lib/api/engine";
import { getApiUrl } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const initial: EngineFormState = {
  amount: 100,
  isLiveTrading: false,
  isSentimentEnabled: true,
  direction: "long",
  skipHeld: true,
  caps: DEFAULT_CAPS,
};

type Stage = "configure" | "preview" | "result";

export function EngineFlow() {
  const { user } = useUser();
  const [stage, setStage] = useState<Stage>("configure");
  const [state, setState] = useState<EngineFormState>(initial);
  const [preview, setPreview] = useState<EnginePreview | null>(null);
  const [result, setResult] = useState<EngineExecuteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cash, setCash] = useState<number | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("alpaca_access_token") : null;
    if (!token) return;
    fetch(`${getApiUrl()}/api/v4/dashboard-data`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ isLive: state.isLiveTrading }),
    })
      .then((r) => r.json())
      .then((d) => setCash(Number(d?.account?.cash) || 0))
      .catch(() => {});
  }, [state.isLiveTrading]);

  const email = user?.primaryEmailAddress?.emailAddress;

  const onPreview = async () => {
    if (!email) return;
    setLoading(true); setError(null);
    try {
      const r = await previewEngine(state, email);
      setPreview(r.preview);
      setStage("preview");
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  const onPlace = async () => {
    if (!email) return;
    setLoading(true); setError(null);
    try {
      const r = await executeEngine(state, email);
      setResult(r);
      setStage("result");
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  return (
    <>
      {error && (
        <div className="mx-auto max-w-3xl px-4 pt-6">
          <Alert>
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}
      {stage === "configure" && (
        <ConfigureStep
          state={state} onChange={setState}
          onPreview={onPreview}
          availableCash={cash}
          loading={loading}
        />
      )}
      {stage === "preview" && preview && (
        <PreviewStep
          preview={preview}
          stopPct={state.caps.perPositionStopLossPct}
          tpPct={state.caps.perPositionTakeProfitPct}
          onAdjust={() => setStage("configure")}
          onPlace={onPlace}
          loading={loading}
        />
      )}
      {stage === "result" && result && (
        <ResultStep
          result={result}
          onAnother={() => { setResult(null); setPreview(null); setStage("configure"); }}
        />
      )}
    </>
  );
}
```

- [ ] **Step 4: Replace TradePanel on /trade**

In `frontend/src/app/(front)/trade/page.tsx`, replace `<LoginPrompt />` (or whatever currently renders `TradePanel`) with `<EngineFlow />` when the user is signed-in. Keep the existing OAuth callback effect untouched.

```tsx
import { EngineFlow } from "@/components/v4/trade/engine-flow";
import { OrderDrawer } from "@/components/v4/order-drawer/order-drawer";
// inside JSX, after Breadcrumb:
{accessToken ? <EngineFlow /> : <LoginPrompt />}
<OrderDrawer />
```

- [ ] **Step 5: Manual verify (paper mode)**

```
cd frontend && yarn dev
```

On `/trade`:
1. Configure step renders, preset chips (25/50/75/100%) work, all caps default correctly, available cash shows.
2. Click `Preview picks →` → Preview step renders the table with ticker rows, allocation totals, and footer line including `Stop −3% · Target +5%`.
3. Click `Adjust` → returns to step 1 with all inputs preserved.
4. Click `Place N orders` → Result step renders with status per row.
5. Backend logs show bracket payloads (or fallback to simple if no stop/target).

- [ ] **Step 6: Commit**

```
git add frontend/src/components/v4/trade frontend/src/app/\(front\)/trade
git commit -m "feat(engine): 4-step Configure→Preview→Execute→Result on /trade"
```

---

## Task 14: Trade button on each /analysis chart page

**Files:**
- Modify: `frontend/src/app/(front)/analysis/technical/page.tsx`
- Modify: `frontend/src/app/(front)/analysis/fundamental/page.tsx`
- Modify: `frontend/src/app/(front)/analysis/sentiment/page.tsx`
- Modify: `frontend/src/app/(front)/analysis/price/page.tsx`
- Modify: `frontend/src/app/(front)/analysis/volatility/page.tsx`
- Create: `frontend/src/components/v4/order-drawer/trade-button.tsx`

**Context:** The analysis pages don't pass a "currently selected" symbol — the charts (`tech-chart.tsx` etc.) own their own ticker pickers internally. Rather than thread state up through every chart, the simplest correct path is: each analysis page renders a compact symbol-picker + Trade button at the top of the page that opens the OrderDrawer with whatever the user typed. Power users can also still click any ticker on the `/analysis/ratings` page or `/dashboard` rows.

- [ ] **Step 1: Trade button widget**

`frontend/src/components/v4/order-drawer/trade-button.tsx`:

```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOrderDrawer } from "@/lib/order-drawer-store";

export function TradeButton() {
  const open = useOrderDrawer((s) => s.open);
  const [symbol, setSymbol] = useState("");
  return (
    <div className="my-4 flex items-center gap-2">
      <Input placeholder="Ticker (e.g. NVDA)" value={symbol}
        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
        className="w-40" />
      <Button onClick={() => symbol && open(symbol)} disabled={!symbol}>
        Trade
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Add it (and the OrderDrawer) to each /analysis/* page**

In each of the five files, add to imports:

```tsx
import { TradeButton } from "@/components/v4/order-drawer/trade-button";
import { OrderDrawer } from "@/components/v4/order-drawer/order-drawer";
```

And add `<TradeButton />` after the `Breadcrumb` block, plus `<OrderDrawer />` at the end of the `<ContentLayout>` body.

- [ ] **Step 3: Manual verify**

Visit each `/analysis/<dim>` page. The Trade input + button should appear above the chart. Type a symbol → click Trade → drawer opens with that symbol.

- [ ] **Step 4: Commit**

```
git add frontend/src/components/v4/order-drawer/trade-button.tsx frontend/src/app/\(front\)/analysis
git commit -m "feat(analysis): Trade button on each chart page opens OrderDrawer"
```

---

## Task 15: End-to-end smoke + cleanup

- [ ] **Step 1: Run all backend tests**

```
cd backend && yarn jest --runInBand
```

Expected: green.

- [ ] **Step 2: Type-check frontend**

```
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual end-to-end on paper**

In one terminal:
```
cd backend && yarn start:dev
```
In another:
```
cd frontend && yarn dev
```

Walk the full happy path:
1. Sign in → land on `/dashboard` → composite badges visible on positions.
2. Click a position row → drawer opens → fill 0.5 shares Buy, market, $ → review → confirm → success.
3. Visit `/analysis/ratings` → composite + 5 dimension tables render → click a row → drawer opens.
4. Visit `/trade` → Configure step → set $50, max positions 3 → Preview → see 3 rows → Place 3 orders → Result page.
5. Back to `/dashboard` → new positions visible.

- [ ] **Step 4: Remove obsolete code**

- Old `frontend/src/components/v2/trade-form.tsx` is no longer imported by `/trade`. Delete the file (or, if you'd rather keep it for reference, leave it — but no other surface should import it).
- Confirm with grep:
  ```
  cd frontend && grep -r "TradePanel" src
  ```
  Expected: zero matches.

- [ ] **Step 5: Final commit**

```
git add -A
git commit -m "chore: remove unused TradePanel; close out app-improvements branch"
```

---

## Self-review (run before handing off)

1. **Spec coverage**
   - Per-ticker OrderDrawer (tier B) — Tasks 6–8, 14
   - Engine 4-step flow with caps, dryRun, bracket — Tasks 5, 12, 13
   - `/analysis/ratings` page with composite + 5 dimension tables + sticky sub-nav — Tasks 9, 10
   - Dashboard composite-score column with tooltip + "View full ratings" link — Task 11
   - `GET /api/v1/ratings` endpoint with normalization — Tasks 1, 2, 3
   - `POST /api/v1/trade/order` (bracket-aware) — Task 4
   - Engine extension (`dryRun`, `caps`, bracket per position) — Task 5
   - Trade button on each analysis chart page — Task 14
   - Stop-loss / take-profit in both flows — Tasks 4 (drawer), 5 (engine)
   - Replace hardcoded 0.99/1.03 in `monitorAndManagePositions` — Task 5 places brackets *at submit time*, which makes monitoring obsolete for stop/target. Brackets are managed by Alpaca server-side. **Note:** the existing `monitorAndManagePositions` cron is left running but its behavior is now redundant for new bracketed positions; left as a safety net for any legacy positions placed before this change. ✅

2. **Placeholder scan** — None. Every code step is concrete; the `analysis-service` collection-name dependency is explicitly addressed in Task 2 Step 1 (discover-then-implement) rather than left as TBD.

3. **Type consistency** — `EngineCaps`, `OrderRequest`, `EnginePreview`, `RatingRow` all match across backend (`trade-types.ts`, `ratings-types.ts`) and frontend (`api/engine.ts`, `api/ratings.ts`, `api/orders.ts`). `useOrderDrawer().open(symbol)` is used consistently in dashboard, ratings tables, and TradeButton.
