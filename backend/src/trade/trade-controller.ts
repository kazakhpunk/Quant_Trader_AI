import { Request, Response } from "express";
import TradeService from "./trade-multiuser-service";
import { validateOrderRequest, OrderRequest } from "./trade-types";

class TradeController {
  private tradeService: TradeService;

  constructor(tradeService: TradeService) {
    this.tradeService = tradeService;

    this.executeTrades = this.executeTrades.bind(this);
    this.getLatestPrice = this.getLatestPrice.bind(this);
    this.startMonitoringCronJob = this.startMonitoringCronJob.bind(this);
    this.monitorAndManagePositions = this.monitorAndManagePositions.bind(this);
    this.isMarketOpen = this.isMarketOpen.bind(this);
    this.fetchAndAnalyzeData = this.fetchAndAnalyzeData.bind(this);
    this.placeOrder = this.placeOrder.bind(this);
    this.closeAllPositions = this.closeAllPositions.bind(this);
    this.cancelAllOrders = this.cancelAllOrders.bind(this);
  }

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

  public async getLatestPrice(req: Request, res: Response): Promise<void> {
    try {
      const { ticker, email, isLiveTrading } = req.body;
      console.log("Received request with params:", {
        ticker,
        email,
        isLiveTrading,
      });

      if (!ticker || !email) {
        res.status(400).json({ error: "Symbol and email are required" });
      }
      const price = await this.tradeService.getLatestPrice(
        ticker,
        email,
        isLiveTrading
      );
      res.status(200).json({ price });
    } catch (error: any) {
      console.error("Error fetching latest price:", error);
      res.status(500).json({ error: error.message });
    }
  }

  public async startMonitoringCronJob(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { email, isLiveTrading } = req.body;
      await this.tradeService.startMonitoringCronJob(email, isLiveTrading);
      res.status(200).json({ message: "Cron Job started successfully" });
    } catch (error: any) {
      console.error("Error starting cron job:", error);
      res.status(500).json({ error: error.message });
    }
  }

  public async monitorAndManagePositions(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { email, isLiveTrading } = req.body;
      if (!email) {
        res.status(400).json({ error: "email is required" });
        return;
      }
      const result = await this.tradeService.monitorAndManagePositions(email, isLiveTrading);
      res.status(200).json(result);
    } catch (error: any) {
      console.error("Error monitoring :", error);
      res.status(500).json({ error: error.message });
    }
  }

  public async fetchAndAnalyzeData(req: Request, res: Response): Promise<void> {
    try {
      await this.tradeService.fetchAndAnalyzeData();
      res.status(200).json({ message: "Analysis started successfully" });
    } catch (error: any) {
      console.error("Error starting analysis:", error);
      res.status(500).json({ error: error.message });
    }
  }

  public async isMarketOpen(req: Request, res: Response): Promise<void> {
    try {
      const { email, isLiveTrading } = req.body;
      const isOpen = await this.tradeService.isMarketOpen(email, isLiveTrading);
      res.json({ market_is_open: isOpen });
    } catch (error: any) {
      console.error("Error checking market status:", error);
      res.status(500).json({ error: error.message });
    }
  }

  public async placeOrder(req: Request, res: Response): Promise<void> {
    const body = req.body as Partial<OrderRequest>;
    const err = validateOrderRequest(body);
    if (err) { res.status(400).json({ error: err }); return; }
    const result = await this.tradeService.placeOrder(body as OrderRequest);
    res.status(result.ok ? 200 : 502).json(result);
  }

  public async closeAllPositions(req: Request, res: Response): Promise<void> {
    try {
      const { email, isLiveTrading } = req.body;
      if (!email) { res.status(400).json({ error: "email required" }); return; }
      const result = await this.tradeService.closeAllPositions(email, !!isLiveTrading);
      res.status(result.ok ? 200 : 502).json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  public async cancelAllOrders(req: Request, res: Response): Promise<void> {
    try {
      const { email, isLiveTrading } = req.body;
      if (!email) { res.status(400).json({ error: "email required" }); return; }
      const result = await this.tradeService.cancelAllOrders(email, !!isLiveTrading);
      res.status(result.ok ? 200 : 502).json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }
}

export default TradeController;
