import { Request, Response } from 'express';
import TradeService from './trade-service';

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
      await this.tradeService.executeTrades();
      res.status(200).json({ message: 'Trades executed successfully' });
    } catch (error: any) {
      console.error('Error executing trades:', error);
      res.status(500).json({ error: error.message });
    }
  }
  public async getLatestPrice(req: Request, res: Response): Promise<void> {
    try {
        const ticker = req.params.ticker;
        await this.tradeService.getLatestPrice(ticker);
        res.status(200).json({ message: 'Trades executed successfully' });
    } catch (error: any) {
      console.error('Error executing trades:', error);
      res.status(500).json({ error: error.message });
    }
  }
  public async startMonitoringCronJob(req: Request, res: Response): Promise<void> {
    try {
      await this.tradeService.startMonitoringCronJob();
      res.status(200).json({ message: 'Cron Job executed' });
    } catch (error: any) {
      console.error('Error executing cronjob:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  public async startCombinedCronJob(req: Request, res: Response): Promise<void> {
    try {
      await this.tradeService.startCombinedCronJob();
      res.status(200).json({ message: 'Cron Job executed' });
    } catch (error: any) {
      console.error('Error executing cronjob:', error);
      res.status(500).json({ error: error.message });
    }
  }

  public async isMarketOpen(req: Request, res: Response): Promise<void> {
    try {
    const isOpen = await this.tradeService.isMarketOpen();
    res.json({ market_is_open: isOpen });
    } catch (error: any) {
      console.error('Error executing:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default TradeController;
