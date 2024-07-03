import { Request, Response } from 'express';
import AnalysisService from './analysis-service';
import { AnalysisResult } from './types/analysisModel';

class AnalysisController {
  private analysisService: AnalysisService;

  constructor(analysisService: AnalysisService) {
    this.analysisService = analysisService;

    this.analyzeResults = this.analyzeResults.bind(this);
    this.getTickers = this.getTickers.bind(this);
    this.addTicker = this.addTicker.bind(this);
    this.removeTicker = this.removeTicker.bind(this);
    this.getAllTechnicalData = this.getAllTechnicalData.bind(this);
    this.getTechnicalData = this.getTechnicalData.bind(this);
    this.getAllFundamentalData = this.getAllFundamentalData.bind(this);
    this.postFundamentalData = this.postFundamentalData.bind(this);
    this.getFundamentalData = this.getFundamentalData.bind(this);
    this.fetchHistoricalData = this.fetchHistoricalData.bind(this); 
    this.fetchRealTimeData = this.fetchRealTimeData.bind(this); 
    this.getNewsArticles = this.getNewsArticles.bind(this); 
    this.analyzeSentiment = this.analyzeSentiment.bind(this); 
    this.analyzeWithSentiment = this.analyzeWithSentiment.bind(this); 
  }

  public async getAllTechnicalData(req: Request, res: Response): Promise<void> {
    try {
      const results = await this.analysisService.getAllTechnicalData();
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  public async getAllFundamentalData(req: Request, res: Response): Promise<void> {
    try {
      const results = await this.analysisService.getAllFundamentalData();
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  public async getTechnicalData(req: Request, res: Response): Promise<void> {
    try {
      const ticker = req.params.ticker;
      const results = await this.analysisService.getTechnicalData(ticker);
      res.json(results); // Return the full data including the SMA calculations
    } catch (error: any) {
      console.error("Error in fetchAllSmaData:", error);
      res.status(500).json({ error: error.message });
    }
  }

  public async getFundamentalData(req: Request, res: Response): Promise<void> {
    try {
      const ticker = req.params.ticker;
      const results = await this.analysisService.getFundamentalData(ticker);
      res.json(results); // Return the full data including the SMA calculations
    } catch (error: any) {
      console.error("Error in fetchAllSmaData:", error);
      res.status(500).json({ error: error.message });
    }
  }

  public async postFundamentalData(req: Request, res: Response): Promise<void> {
    try {
      const ticker = req.params.ticker;
      const results = await this.analysisService.postFundamentalData(ticker);
      res.json(results); // Return the full data including the SMA calculations
    } catch (error: any) {
      console.error("Error in fetchAllSmaData:", error);
      res.status(500).json({ error: error.message });
    }
  }

  public async getTickers(req: Request, res: Response): Promise<void> {
    res.json({ tickers: Array.from(this.analysisService.getAllTickers()) });
  }

  public async addTicker(req: Request, res: Response): Promise<void> {
    const ticker = req.body.ticker;
    if (!ticker) {
      res.status(400).send("Ticker is required");
      return;
    }
    this.analysisService.addTicker(ticker);
    res.status(201).json({ message: 'Ticker added' });
  }

  public async removeTicker(req: Request, res: Response): Promise<void> {
    const ticker = req.body.ticker;
    if (!ticker) {
      res.status(400).send("Ticker is required");
      return;
    }
    this.analysisService.removeTicker(ticker);
    res.status(201).json({ message: 'Ticker removed' });
  }

  public async getAllTickers(req: Request, res: Response): Promise<void> {
    const tickers = this.analysisService.getAllTickers();
    res.json(tickers);
  }

  public async analyzeResults(req: Request, res: Response): Promise<void> {
    try {
      const analysis = await this.analysisService.analyzeResults();
      res.json(analysis);
    } catch (error: any) {
      console.error('Error analyzing results:', error);
      res.status(500).json({ error: error.message });
    }
  }

  public async fetchRealTimeData(req: Request, res: Response): Promise<void> {
    const ticker = req.params.ticker;
    try {
      const realTimeData = await this.analysisService.fetchRealTimeData(ticker);
      res.json(realTimeData);
    } catch (error: any) {
      console.error(`Error fetching real-time data for ticker ${ticker}:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  public async getNewsArticles(req: Request, res: Response): Promise<void> {
    const ticker = req.params.ticker;
    try {
      const news = await this.analysisService.getNewsArticles(ticker);
      res.json(news);
    } catch (error: any) {
      console.error(`Error fetching News for ticker ${ticker}:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  public async analyzeSentiment(req: Request, res: Response): Promise<void> {
    try {
      const ticker = req.params.ticker;
      const results = await this.analysisService.analyzeSentiment(ticker);
      res.json(results); // Return the full data including the SMA calculations
    } catch (error: any) {
      console.error("Error in Analyzing Sentiment:", error);
      res.status(500).json({ error: error.message });
    }
  }

  public async analyzeWithSentiment(req: Request, res: Response): Promise<void> {
    try {
      const analysis = await this.analysisService.analyzeWithSentiment();
      res.json(analysis);
    } catch (error: any) {
      console.error('Error analyzing sentiment:', error);
      res.status(500).json({ error: error.message });
    }
  }

  public async fetchHistoricalData(req: Request, res: Response): Promise<void> {
    const ticker = req.params.ticker;
    try {
      const data = await this.analysisService.fetchHistoricalData(ticker);
      res.json({ ticker, data });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

}

export default AnalysisController;
