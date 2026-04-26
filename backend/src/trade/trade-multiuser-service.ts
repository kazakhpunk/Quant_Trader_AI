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
import { Db } from "mongodb";
import cron from "node-cron";
import Bottleneck from "bottleneck";
import { qstash } from "../qstash";

class TradeService {
  private analysisService: AnalysisService;
  private db: Db;
  private limiter: Bottleneck;
  private authService: any;

  constructor(db: Db) {
    this.db = db;
    this.authService = new AuthService(db);
    this.analysisService = new AnalysisService(db);
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
        composite: 0,
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
      diagnostics: {
        totalCandidates,
        afterDirection,
        afterSentiment,
        afterSkipHeld,
        afterCap,
      },
    };
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

    const actions: { symbol: string; type: "stop-loss" | "take-profit"; price: number }[] = [];
    const STOP_LOSS_THRESHOLD = 0.99;
    const TAKE_PROFIT_THRESHOLD = 1.03;

    for (const position of positions) {
      const { symbol, qty, avg_entry_price } = position;
      const latestPrice = await this.getLatestPrice(symbol, email, isLive);

      const entry = parseFloat(avg_entry_price);
      const stopLossPrice = entry * STOP_LOSS_THRESHOLD;
      const takeProfitPrice = entry * TAKE_PROFIT_THRESHOLD;

      const sellOrder = (label: string, price: number) =>
        this.limiter.schedule(() =>
          axios.post(
            `${apiUrl}/orders`,
            { symbol, qty, side: "sell", type: "market", time_in_force: "day" },
            { headers }
          )
        ).then(() => {
          console.log(`${label} order placed for ${symbol} at ${price}`);
        });

      if (latestPrice <= stopLossPrice) {
        await sellOrder("Stop-loss", stopLossPrice);
        actions.push({ symbol, type: "stop-loss", price: stopLossPrice });
      } else if (latestPrice >= takeProfitPrice) {
        await sellOrder("Take-profit", takeProfitPrice);
        actions.push({ symbol, type: "take-profit", price: takeProfitPrice });
      }
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
