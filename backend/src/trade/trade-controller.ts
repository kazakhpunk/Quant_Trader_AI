import { Request, Response } from "express";
import TradeService from "./trade-multiuser-service";

class TradeController {
  private tradeService: TradeService;

  constructor(tradeService: TradeService) {
    this.tradeService = tradeService;

    this.executeTrades = this.executeTrades.bind(this);
    this.getLatestPrice = this.getLatestPrice.bind(this);
    this.startMonitoringCronJob = this.startMonitoringCronJob.bind(this);
    this.isMarketOpen = this.isMarketOpen.bind(this);
    this.fetchAndAnalyzeData = this.fetchAndAnalyzeData.bind(this);
  }

  public async executeTrades(req: Request, res: Response): Promise<void> {
    try {
      const { amount, email, isLiveTrading, isSentimentEnabled } = req.body;
      console.log("Received request with params:", {
        amount,
        email,
        isLiveTrading,
        isSentimentEnabled,
      });

      if (!amount || !email) {
        res.status(400).json({ error: "Amount and email are required" });
      }

      await this.tradeService.executeTrades(
        amount,
        email,
        isLiveTrading,
        isSentimentEnabled
      );
      res.status(200).json({ message: "Trades executed successfully" });
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
      await this.tradeService.monitorAndManagePositions(email, isLiveTrading);
      res.status(200).json({ message: "Monitoring positions was successful" });
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
}

export default TradeController;
