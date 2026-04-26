import axios from "axios";
import {
  OrderRequest,
  OrderResult,
  EngineRequest,
  EnginePreview,
  EnginePreviewRow,
  DEFAULT_CAPS,
  EngineCaps,
} from "./trade-types";
import AnalysisService from "../analysis/analysis-service";
import AuthService from "../auth/auth-service";
import { RatingsService } from "../ratings/ratings-service";
import { Db } from "mongodb";
import cron from "node-cron";
import Bottleneck from "bottleneck";
import { qstash } from "../qstash";

class TradeService {
  private analysisService: AnalysisService;
  private ratingsService: RatingsService;
  private db: Db;
  private limiter: Bottleneck;
  private authService: any;

  constructor(db: Db) {
    this.db = db;
    this.authService = new AuthService(db);
    this.analysisService = new AnalysisService(db);
    this.ratingsService = new RatingsService(db);
    this.limiter = new Bottleneck({
      minTime: 1000, // 1 second between each request
      maxConcurrent: 1, // Only one request at a time
    });
  }

  private async getAccessToken(email: string): Promise<string | null> {
    try {
      const user = await this.db.collection("users").findOne({ email });
      return user?.alpacaToken || null;
    } catch (error) {
      console.error("Error retrieving token:", error);
      throw new Error("Failed to retrieve token");
    }
  }

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

  private getApiBaseUrl(isLive: boolean): string {
    return isLive
      ? "https://api.alpaca.markets/v2"
      : "https://paper-api.alpaca.markets/v2";
  }

  private getHostUrl(): string {
    return process.env.NODE_ENV === "development"
      ? "http://localhost:8000"
      : "https://quanttraderai-production.up.railway.app";
  }

  private getDataApiBaseUrl(): string {
    return "https://data.alpaca.markets/v2";
  }

  private async checkAccountBalance(
    email: string,
    amount: number,
    isLive: boolean
  ): Promise<void> {
    const accessToken = await this.getAccessToken(email);
    if (!accessToken) throw new Error("Access token is missing");

    const apiUrl = this.getApiBaseUrl(isLive);

    const response = await axios.get(`${apiUrl}/account`, {
      headers: {
        // 'APCA-API-KEY-ID': isLive ? process.env.LIVE_API_KEY : process.env.PAPER_API_KEY,
        // 'APCA-API-SECRET-KEY': isLive ? process.env.LIVE_SECRET_KEY : process.env.PAPER_SECRET_KEY,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const accountBalance = response.data.cash;

    if (parseFloat(accountBalance) < amount) {
      throw new Error("Insufficient balance. Please deposit more funds.");
    }
  }

  public async getLatestPrice(
    symbol: string,
    email: string,
    isLive: boolean
  ): Promise<number> {
    try {
      const accessToken = await this.getAccessToken(email);
      if (!accessToken) throw new Error("Access token is missing");

      const dataApiUrl = this.getDataApiBaseUrl();

      const response = await axios.get(
        `${dataApiUrl}/stocks/${symbol}/trades/latest`,
        {
          headers: {
            // 'APCA-API-KEY-ID': isLive ? process.env.LIVE_API_KEY : process.env.PAPER_API_KEY,
            // 'APCA-API-SECRET-KEY': isLive ? process.env.LIVE_SECRET_KEY : process.env.PAPER_SECRET_KEY,
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const price = response.data.trade?.p;
      if (!price) throw new Error(`Price not found for symbol: ${symbol}`);
      return price;
    } catch (error) {
      console.error(`Error fetching latest price for ${symbol}:`, error);
      throw new Error(`Could not fetch latest price for ${symbol}`);
    }
  }

  private async placeSimpleOrder(
    symbol: string,
    quantity: number,
    isLong: boolean,
    email: string,
    isLive: boolean
  ): Promise<void> {
    try {
      const accessToken = await this.getAccessToken(email);
      if (!accessToken) throw new Error("Access token is missing");

      const apiUrl = this.getApiBaseUrl(isLive);

      const side = isLong ? "buy" : "sell";
      const timeInForce = "day"; // Ensure 'day' for fractional shares

      await axios.post(
        `${apiUrl}/orders`,
        {
          symbol,
          qty: quantity,
          side: side,
          type: "market",
          time_in_force: timeInForce,
        },
        {
          headers: {
            // 'APCA-API-KEY-ID': isLive ? process.env.LIVE_API_KEY : process.env.PAPER_API_KEY,
            // 'APCA-API-SECRET-KEY': isLive ? process.env.LIVE_SECRET_KEY : process.env.PAPER_SECRET_KEY,
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        `${side} simple order placed for ${symbol} with quantity ${quantity}`
      );
    } catch (error) {
      console.error(`Error placing simple order for ${symbol}:`, error);
    }
  }

  public async placeOrder(req: OrderRequest): Promise<OrderResult> {
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

    // Alpaca rejects bracket orders on fractional shares ("fractional orders
    // must be simple orders"). Skip the bracket in that case and surface a
    // non-fatal note so the UI can warn the user that stop/take-profit isn't
    // attached.
    const isFractional = qty % 1 !== 0;
    const wantsBracket =
      (req.stopLossPct != null || req.takeProfitPct != null) && !isFractional;
    const droppedBracket =
      isFractional && (req.stopLossPct != null || req.takeProfitPct != null);

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
      const result: OrderResult = { ok: true, orderId: data.id, status: data.status };
      if (droppedBracket) {
        // Alpaca won't accept the bracket, so persist a soft bracket record.
        // monitorAndManagePositions reads these and submits a market sell when
        // the price crosses either threshold.
        const refForBracket =
          referencePrice ??
          (req.orderType === "limit"
            ? req.limitPrice ?? null
            : await this.getLatestPrice(req.symbol, req.email, req.isLiveTrading).catch(() => null));
        if (refForBracket != null) {
          await this.db.collection("softBrackets").insertOne({
            email: req.email,
            symbol: req.symbol,
            side: req.side,
            entryPrice: refForBracket,
            stopLossPct: req.stopLossPct ?? null,
            takeProfitPct: req.takeProfitPct ?? null,
            isLive: !!req.isLiveTrading,
            orderId: data.id,
            createdAt: new Date(),
            isActive: true,
          });
          const sl = req.stopLossPct != null ? `Stop −${req.stopLossPct}%` : "";
          const tp = req.takeProfitPct != null ? `Take-profit +${req.takeProfitPct}%` : "";
          const parts = [sl, tp].filter(Boolean).join(" / ");
          if (parts) result.note = `${parts} monitored by background poller.`;
        }
      }
      return result;
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message;
      return { ok: false, error: msg };
    }
  }

  public async previewTrades(req: EngineRequest): Promise<EnginePreview> {
    const caps: EngineCaps = { ...DEFAULT_CAPS, ...(req.caps ?? {}) };
    const direction = req.direction ?? "long";
    const skipHeld = req.skipHeld ?? true;

    const { longCandidates, shortCandidates } =
      await this.analysisService.getCandidatesFromDB();
    const totalCandidates = longCandidates.length + shortCandidates.length;

    let pool: { ticker: string; sentiment?: number; side: "buy" | "sell" }[] = [];
    if (direction !== "short")
      pool.push(...longCandidates.map((c: any) => ({ ...c, side: "buy" as const })));
    if (direction !== "long")
      pool.push(...shortCandidates.map((c: any) => ({ ...c, side: "sell" as const })));
    const afterDirection = pool.length;

    if (req.isSentimentEnabled) pool = pool.filter((c) => (c.sentiment ?? 1) > 0.5);
    const afterSentiment = pool.length;

    if (skipHeld) {
      const held = await this.getCurrentHoldings(req.email, req.isLiveTrading);
      pool = pool.filter((c) => !held.has(c.ticker));
    }
    const afterSkipHeld = pool.length;

    pool = pool.slice(0, caps.maxPositions);
    const afterCap = pool.length;

    // Preview pricing: use the close stored in technicalData by the analysis
    // pipeline. Avoids N Alpaca round-trips and works for users without a
    // brokerage connected. Live execution still uses getLatestPrice.
    const tickers = pool.map((c) => c.ticker);
    const techDocs = tickers.length
      ? await this.db
          .collection("technicalData")
          .find({ ticker: { $in: tickers } })
          .project({ ticker: 1, close: 1, _id: 0 })
          .toArray()
      : [];
    const closeByTicker = new Map<string, number>(
      techDocs
        .filter((d: any) => typeof d.close === "number" && d.close > 0)
        .map((d: any) => [d.ticker as string, d.close as number])
    );

    // Resolve prices first; drop tickers we can't price at preview time.
    const resolved: { c: typeof pool[number]; price: number }[] = [];
    for (const c of pool) {
      let price = closeByTicker.get(c.ticker);
      if (price == null) {
        try {
          price = await this.getLatestPrice(c.ticker, req.email, req.isLiveTrading);
        } catch {
          continue;
        }
      }
      resolved.push({ c, price });
    }

    // Per-position allocation honors maxPositionPct as a hard ceiling: we
    // never violate the user's stated concentration limit. If the pool is too
    // small to deploy the full requested amount under that cap, the remainder
    // stays as cash and is surfaced in the preview as `cashBuffer` so the UI
    // can explain why total < requested.
    const evenAlloc = resolved.length ? req.amount / resolved.length : 0;
    const maxPerPos = (caps.maxPositionPct / 100) * req.amount;
    const perPosAlloc = Math.min(evenAlloc, maxPerPos);

    // Composite per ticker, direction-aware. RatingsService re-queries the
    // source collections — fine for preview which runs only on user action.
    const compositeByTicker = new Map<string, number>();
    if (resolved.length) {
      const wantedTickers = new Set(resolved.map((r) => r.c.ticker));
      const allRatings = await this.ratingsService.getAll();
      for (const rr of allRatings) {
        if (!wantedTickers.has(rr.ticker)) continue;
        compositeByTicker.set(
          rr.ticker,
          direction === "short" ? rr.compositeShort : rr.compositeLong
        );
      }
    }

    const rows: EnginePreviewRow[] = resolved.map(({ c, price }) => {
      const qty = parseFloat((perPosAlloc / price).toFixed(2));
      return {
        ticker: c.ticker,
        side: c.side,
        composite: compositeByTicker.get(c.ticker) ?? 0,
        topSignals: c.sentiment != null ? [`Sent ${Math.round(c.sentiment * 100)}`] : [],
        allocation: +(qty * price).toFixed(2),
        qty,
        price,
      };
    });
    const totalAllocated = +rows.reduce((s, r) => s + r.allocation, 0).toFixed(2);
    const cashBuffer = +(req.amount - totalAllocated).toFixed(2);
    // Buffer attributable specifically to the cap binding (vs qty rounding).
    const capBindingBuffer = +Math.max(
      0,
      req.amount - resolved.length * maxPerPos
    ).toFixed(2);

    return {
      rows,
      totalAllocated,
      totalRequested: req.amount,
      cashBuffer,
      capBindingBuffer,
      caps,
      diagnostics: {
        totalCandidates,
        afterDirection,
        afterSentiment,
        afterSkipHeld,
        afterCap,
      },
    };
  }

  public async listPositions(
    email: string,
    isLive: boolean
  ): Promise<{ ok: boolean; positions?: any[]; error?: string }> {
    const accessToken = await this.getAccessToken(email);
    if (!accessToken) return { ok: false, error: "no brokerage connected" };
    const apiUrl = this.getApiBaseUrl(isLive);
    try {
      const { data } = await axios.get(`${apiUrl}/positions`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return { ok: true, positions: data ?? [] };
    } catch (err: any) {
      return { ok: false, error: err?.response?.data?.message || err.message };
    }
  }

  public async listOpenOrders(
    email: string,
    isLive: boolean
  ): Promise<{ ok: boolean; orders?: any[]; error?: string }> {
    const accessToken = await this.getAccessToken(email);
    if (!accessToken) return { ok: false, error: "no brokerage connected" };
    const apiUrl = this.getApiBaseUrl(isLive);
    try {
      const { data } = await axios.get(`${apiUrl}/orders?status=open`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return { ok: true, orders: data ?? [] };
    } catch (err: any) {
      return { ok: false, error: err?.response?.data?.message || err.message };
    }
  }

  public async closePosition(
    email: string,
    isLive: boolean,
    symbol: string
  ): Promise<{ ok: boolean; closed?: any; error?: string }> {
    const accessToken = await this.getAccessToken(email);
    if (!accessToken) return { ok: false, error: "no brokerage connected" };
    const apiUrl = this.getApiBaseUrl(isLive);
    try {
      const { data } = await axios.delete(`${apiUrl}/positions/${encodeURIComponent(symbol)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return { ok: true, closed: data };
    } catch (err: any) {
      return { ok: false, error: err?.response?.data?.message || err.message };
    }
  }

  public async cancelOrder(
    email: string,
    isLive: boolean,
    orderId: string
  ): Promise<{ ok: boolean; error?: string }> {
    const accessToken = await this.getAccessToken(email);
    if (!accessToken) return { ok: false, error: "no brokerage connected" };
    const apiUrl = this.getApiBaseUrl(isLive);
    try {
      await axios.delete(`${apiUrl}/orders/${encodeURIComponent(orderId)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.response?.data?.message || err.message };
    }
  }

  public async closeAllPositions(
    email: string,
    isLive: boolean
  ): Promise<{ ok: boolean; closed?: any; error?: string }> {
    const accessToken = await this.getAccessToken(email);
    if (!accessToken) return { ok: false, error: "no brokerage connected" };
    const apiUrl = this.getApiBaseUrl(isLive);
    try {
      // Alpaca DELETE /v2/positions liquidates all positions AND cancels their
      // related open orders in one call.
      const { data } = await axios.delete(`${apiUrl}/positions`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return { ok: true, closed: data };
    } catch (err: any) {
      return { ok: false, error: err?.response?.data?.message || err.message };
    }
  }

  public async cancelAllOrders(
    email: string,
    isLive: boolean
  ): Promise<{ ok: boolean; cancelled?: any; error?: string }> {
    const accessToken = await this.getAccessToken(email);
    if (!accessToken) return { ok: false, error: "no brokerage connected" };
    const apiUrl = this.getApiBaseUrl(isLive);
    try {
      const { data } = await axios.delete(`${apiUrl}/orders`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return { ok: true, cancelled: data };
    } catch (err: any) {
      return { ok: false, error: err?.response?.data?.message || err.message };
    }
  }

  public async monitorAndManagePositions(
    email: string,
    isLive: boolean
  ): Promise<{
    ok: boolean;
    skipped?: string;
    positions?: number;
    actions?: { symbol: string; type: "stop-loss" | "take-profit"; price: number }[];
  }> {
    const accessToken = await this.getAccessToken(email);
    if (!accessToken) {
      return { ok: false, skipped: "no brokerage connected" };
    }

    const apiUrl = this.getApiBaseUrl(isLive);
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    const { data: positions } = await axios.get(`${apiUrl}/positions`, { headers });

    if (!positions?.length) {
      return { ok: true, positions: 0, actions: [] };
    }

    // Soft brackets the engine wrote when Alpaca refused server-side brackets
    // (fractional shares). One per (email, symbol, isLive); inactive once fired.
    const softBrackets = await this.db
      .collection("softBrackets")
      .find({ email, isLive, isActive: true })
      .toArray();
    const brktBySymbol = new Map<string, any>(
      softBrackets.map((b: any) => [b.symbol as string, b])
    );

    const actions: { symbol: string; type: "stop-loss" | "take-profit"; price: number }[] = [];

    for (const position of positions) {
      const { symbol, qty, avg_entry_price } = position;
      const brkt = brktBySymbol.get(symbol);
      // Skip positions that don't have an explicit soft bracket — those were
      // either opened with a server-side Alpaca bracket (which Alpaca handles
      // itself) or with no exit at all (user choice).
      if (!brkt) continue;

      const latestPrice = await this.getLatestPrice(symbol, email, isLive);
      const entry = parseFloat(avg_entry_price);
      const stopPct = typeof brkt.stopLossPct === "number" ? brkt.stopLossPct : null;
      const takePct = typeof brkt.takeProfitPct === "number" ? brkt.takeProfitPct : null;

      let trigger: "stop-loss" | "take-profit" | null = null;
      let triggerPrice = 0;
      if (stopPct != null && latestPrice <= entry * (1 - stopPct / 100)) {
        trigger = "stop-loss";
        triggerPrice = +(entry * (1 - stopPct / 100)).toFixed(2);
      } else if (takePct != null && latestPrice >= entry * (1 + takePct / 100)) {
        trigger = "take-profit";
        triggerPrice = +(entry * (1 + takePct / 100)).toFixed(2);
      }

      if (!trigger) continue;

      await this.limiter.schedule(() =>
        axios.post(
          `${apiUrl}/orders`,
          { symbol, qty, side: "sell", type: "market", time_in_force: "day" },
          { headers }
        )
      );
      console.log(`${trigger} sell submitted for ${symbol} at ${triggerPrice}`);
      actions.push({ symbol, type: trigger, price: triggerPrice });

      await this.db.collection("softBrackets").updateOne(
        { _id: brkt._id },
        { $set: { isActive: false, closedAt: new Date(), closeReason: trigger } }
      );
    }

    return { ok: true, positions: positions.length, actions };
  }

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

  public async checkLongStatus(email: string, isLive: boolean) {
    try {
      const accessToken = await this.getAccessToken(email);
      if (!accessToken) throw new Error("Access token is missing");

      const apiUrl = this.getApiBaseUrl(isLive);

      const response = await axios.get(`${apiUrl}/positions`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      const positions = response.data;
      const relevantPositions = positions.map((position: any) => ({
        symbol: position.symbol,
        qty: position.qty,
        avg_entry_price: position.avg_entry_price,
        current_price: position.current_price,
        unrealized_pl: position.unrealized_pl,
      }));

      console.log("Relevant positions:", relevantPositions);

      return relevantPositions;
    } catch (error) {
      console.error("Error checking positions:", error);
      throw error;
    }
  }

  public async startMonitoringCronJob(email: string, isLive: boolean) {
    console.log("Running a task every 10 minutes to check long status");
    try {
      await this.monitorAndManagePositions(email, isLive);
    } catch (error) {
      console.error("Error during cron job:", error);
    }

    cron.schedule("*/10 * * * *", async () => {
      console.log("Running a task every 10 minutes to check long status");
      try {
        await this.monitorAndManagePositions(email, isLive);
        console.log("Task completed");
      } catch (error) {
        console.error("Error during cron job:", error);
      }
    });
  }

  public async startQstash(email: string, isLiveTrading: boolean) {
    try {
      const apiUrl = "https://quanttraderai-production.up.railway.app";
      const destination = `${apiUrl}/api/v1/monitor`;
      const cron = "0 * * * *"; // Run every hour
      const body = JSON.stringify({ email, isLiveTrading });

      if (await this.scheduleExists(destination, cron, body)) {
        console.log(
          `QStash monitor schedule already exists for ${email} (isLive=${isLiveTrading})`
        );
        return;
      }

      const response = await qstash.schedules.create({
        destination,
        headers: { "Content-Type": "application/json" },
        body,
        cron,
      });

      console.log("QStash schedule created successfully:", response);
    } catch (error) {
      console.error("Error during QStash schedule creation:", error);
    }
  }

  public async fetchAndAnalyzeData(): Promise<void> {
    try {
      await this.analysisService.getAllFundamentalData();
      await this.analysisService.getAllTechnicalData();
      await this.analysisService.persistAllSentiment();
      await this.analysisService.analyzeWithSentiment();
      console.log("Data fetch and analysis completed successfully");
    } catch (error) {
      console.error("Error during data fetch and analysis:", error);
    }
  }

  private async scheduleExists(
    destination: string,
    cron: string,
    body?: string
  ): Promise<boolean> {
    try {
      const schedules = await qstash.schedules.list();
      return schedules.some(
        (schedule) =>
          schedule.destination === destination &&
          schedule.cron === cron &&
          (body === undefined || schedule.body === body)
      );
    } catch (error) {
      console.error("Error checking for existing schedule:", error);
      return false;
    }
  }

  public async setupCentralizedQstash() {
    const apiUrl = "https://quanttraderai-production.up.railway.app";

    const destination = `${apiUrl}/api/v1/update`;
    const cron = "0 0 * * *"; // Run daily at midnight

    try {
      if (await this.scheduleExists(destination, cron)) {
        console.log("Centralized QStash schedule already exists");
        return;
      }

      const response = await qstash.schedules.create({
        destination: destination,
        cron: cron,
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log(
        "Centralized QStash schedule created successfully:",
        response
      );
    } catch (error) {
      console.error(
        "Error during centralized QStash schedule creation:",
        error
      );
    }
  }

  public async startCombinedCronJob() {
    console.log("Running daily data fetch and analysis job");
    await this.fetchAndAnalyzeData();
    cron.schedule("0 0 * * *", async () => {
      // Schedule to run daily at midnight
      console.log("Running daily data fetch and analysis job");
      await this.fetchAndAnalyzeData();
    });
  }

  public async isMarketOpen(email: string, isLive: boolean) {
    const accessToken = await this.getAccessToken(email);
    if (!accessToken) throw new Error("Access token is missing");

    const apiUrl = this.getApiBaseUrl(isLive);

    const response = await axios.get(`${apiUrl}/clock`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    return response.data.is_open;
  }
}

export default TradeService;
