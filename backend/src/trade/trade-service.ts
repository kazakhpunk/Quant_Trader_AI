import axios from 'axios';
import Alpaca from '@alpacahq/alpaca-trade-api';
import AnalysisService from '../analysis/analysis-service';
import { Stock } from '../analysis/types/analysisModel';
import { Db, ObjectId } from 'mongodb';
import cron from 'node-cron';
import { WithId, Document } from 'mongodb';
import Bottleneck from 'bottleneck';

class TradeService {
  private alpaca: any;
  private analysisService: AnalysisService;
  private db: Db;
  private limiter: Bottleneck;

  constructor(db: Db) {
    this.alpaca = new Alpaca({
      keyId: process.env.PAPER_API_KEY,
      secretKey: process.env.PAPER_SECRET_KEY,
      paper: true 
    });
    this.db = db;
    this.analysisService = new AnalysisService(db); 
    this.limiter = new Bottleneck({
      minTime: 1000, // 1 second between each request
      maxConcurrent: 1 // Only one request at a time
    });
  }

  public async getLatestPrice(symbol: string): Promise<number> {
    try {
      const response = await this.alpaca.getLatestTrade(symbol);
      const price = response.Price;

      if (!price) throw new Error(`Price not found for symbol: ${symbol}`);
      return price;
    } catch (error) {
      console.error(`Error fetching latest price for ${symbol}:`, error);
      throw new Error(`Could not fetch latest price for ${symbol}`);
    }
  }

  private async placeSimpleOrder(symbol: string, quantity: number, isLong: boolean): Promise<void> {
    try {
      const side = isLong ? 'buy' : 'sell';
      const timeInForce = 'day'; // Ensure 'day' for fractional shares

      await this.alpaca.createOrder({
        symbol,
        qty: quantity,
        side: side,
        type: 'market', // or 'limit'
        time_in_force: timeInForce
      });

      console.log(`${side} simple order placed for ${symbol} with quantity ${quantity}`);
    } catch (error) {
      console.error(`Error placing simple order for ${symbol}:`, error);
    }
  }

  public async monitorAndManagePositions(): Promise<void> {
    try {
      const positions = await this.alpaca.getPositions();
      
      for (const position of positions) {
        const { symbol, qty, avg_entry_price, side } = position;
        const latestPrice = await this.getLatestPrice(symbol);

        const stopLossThreshold = 0.99; // Example: 1% below entry price
        const takeProfitThreshold = 1.03; // Example: 3% above entry price

        const stopLossPrice = parseFloat(avg_entry_price) * stopLossThreshold;
        const takeProfitPrice = parseFloat(avg_entry_price) * takeProfitThreshold;

        if (latestPrice <= stopLossPrice) {
          await this.limiter.schedule(() => this.alpaca.createOrder({
            symbol,
            qty,
            side: 'sell',
            type: 'market',
            time_in_force: 'day'
          }));
          console.log(`Stop-loss order placed for ${symbol} at ${stopLossPrice}`);
        }

        if (latestPrice >= takeProfitPrice) {
          await this.limiter.schedule(() => this.alpaca.createOrder({
            symbol,
            qty,
            side: 'sell',
            type: 'market',
            time_in_force: 'day'
          }));
          console.log(`Take-profit order placed for ${symbol} at ${takeProfitPrice}`);
        }
      }
    } catch (error) {
      console.error('Error monitoring and managing positions:', error);
    }
  }

  public async executeTrades(): Promise<void> {
    const { longCandidates, shortCandidates } = await this.analysisService.getCandidatesFromDB();
    console.log('Long candidates:', longCandidates);
    console.log('Short candidates:', shortCandidates);

    const totalTradingAmount = 100; // Example amount in dollars

    const longAllocation = totalTradingAmount / (longCandidates.length + shortCandidates.length); 
    const shortAllocation = totalTradingAmount / (longCandidates.length + shortCandidates.length); 

    const tradeCandidates = async (candidates: Stock[], allocation: number, isLong: boolean) => {
      for (const candidate of candidates) {
        if (candidate.sentiment ?? 1 > 0.5) {
        const symbol = candidate.ticker;
        const price = await this.getLatestPrice(symbol);
        const quantity = parseFloat((allocation / price).toFixed(2));

        await this.placeSimpleOrder(symbol, quantity, isLong);
      }
      }
    };

    await tradeCandidates(longCandidates, longAllocation, true);

    await this.startMonitoringCronJob();
  }

  public async checkLongStatus() {
    try {
      const positions = await this.alpaca.getPositions();
      const relevantPositions = positions.map(position => ({
        symbol: position.symbol,
        qty: position.qty,
        avg_entry_price: position.avg_entry_price,
        current_price: position.current_price,
        unrealized_pl: position.unrealized_pl,
      }));
  
      console.log('Relevant positions:', relevantPositions);
  
      return relevantPositions;
    } catch (error) {
      console.error('Error checking positions:', error);
      throw error;
    }
  }  
  
  public async startMonitoringCronJob() {
    console.log('Running a task every 10 minutes to check long status');
    try {
      await this.monitorAndManagePositions();
    } 
    catch (error) {
    console.error('Error during cron job:', error);
    }
    cron.schedule('*/10 * * * *', async () => {
      console.log('Running a task every 10 minutes to check long status');
      try {
          await this.monitorAndManagePositions();
          console.log('Task completed');
        } 
       catch (error) {
        console.error('Error during cron job:', error);
      }
    });
  }

  public async fetchAndAnalyzeData(): Promise<void> {
    try {
      await this.analysisService.getAllFundamentalData();
      await this.analysisService.getAllTechnicalData();
      await this.analysisService.analyzeWithSentiment();
      console.log('Data fetch and analysis completed successfully');
    } catch (error) {
      console.error('Error during data fetch and analysis:', error);
    }
  }

  public async startCombinedCronJob() {
    await this.fetchAndAnalyzeData();
    cron.schedule('0 0 * * *', async () => { // Schedule to run daily at midnight
      console.log('Running daily data fetch and analysis job');
      await this.fetchAndAnalyzeData();
    });
  }

  public async isMarketOpen() {
    const clock = await this.alpaca.getClock();
    return clock.is_open;
  }
}

export default TradeService;
