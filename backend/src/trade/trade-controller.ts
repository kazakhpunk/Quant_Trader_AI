import { Request, Response } from 'express';
import TradeService from './trade-multiuser-service';

class TradeController {
  private tradeService: TradeService;

  constructor(tradeService: TradeService) {
    this.tradeService = tradeService;

    this.executeTrades = this.executeTrades.bind(this);
    this.getLatestPrice = this.getLatestPrice.bind(this);
    this.startMonitoringCronJob = this.startMonitoringCronJob.bind(this);
    this.isMarketOpen = this.isMarketOpen.bind(this);
    this.startCombinedCronJob = this.startCombinedCronJob.bind(this);
  }

  public async executeTrades(req: Request, res: Response): Promise<void> {
    try {
      const { amount, email } = req.body;
      await this.tradeService.executeTrades(amount, email);
      res.status(200).json({ message: 'Trades executed successfully' });
    } catch (error: any) {
      console.error('Error executing trades:', error);
      res.status(500).json({ error: error.message });
    }
  }

  public async getLatestPrice(req: Request, res: Response): Promise<void> {
    try {
      const { ticker, email } = req.body;
      const price = await this.tradeService.getLatestPrice(ticker, email);
      res.status(200).json({ price });
    } catch (error: any) {
      console.error('Error fetching latest price:', error);
      res.status(500).json({ error: error.message });
    }
  }

  public async startMonitoringCronJob(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      await this.tradeService.startMonitoringCronJob(email);
      res.status(200).json({ message: 'Cron Job started successfully' });
    } catch (error: any) {
      console.error('Error starting cron job:', error);
      res.status(500).json({ error: error.message });
    }
  }

  public async startCombinedCronJob(req: Request, res: Response): Promise<void> {
    try {
      await this.tradeService.startCombinedCronJob();
      res.status(200).json({ message: 'Combined Cron Job started successfully' });
    } catch (error: any) {
      console.error('Error starting combined cron job:', error);
      res.status(500).json({ error: error.message });
    }
  }

  public async isMarketOpen(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      const isOpen = await this.tradeService.isMarketOpen(email);
      res.json({ market_is_open: isOpen });
    } catch (error: any) {
      console.error('Error checking market status:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default TradeController;
