import fs from 'fs';
import path from 'path';
import yahooFinance from 'yahoo-finance2';
import { Db } from 'mongodb';
import { Stock, AnalysisResult } from './types/analysisModel';
import Sentiment from 'sentiment';
import {load} from 'cheerio';
import axios from 'axios';
import puppeteer from 'puppeteer';
import { ObjectId } from 'mongodb';

class AnalysisService {
  private tickers: Set<string>;
  private db: Db;
  private sentiment: any;

  constructor(db: Db) {
    this.tickers = new Set(this.loadTickers());
    this.sentiment = new Sentiment();
    this.db = db;
  }

  private loadTickers(): string[] {
    try {
      const filePath = path.resolve(__dirname, '../../public/Valid_Ticker_List.txt');
      const data = fs.readFileSync(filePath, 'utf8');
      return data.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
    } catch (err) {
      console.error("Error loading tickers:", err);
      return [];
    }
  }

  private loadCrypto(): string[] {
    try {
      const filePath = path.resolve(__dirname, '../../public/Valid_Crypto.txt');
      const data = fs.readFileSync(filePath, 'utf8');
      return data.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
    } catch (err) {
      console.error("Error loading tickers:", err);
      return [];
    }
  }

  private loadAll(): string[] {
    try {
      const filePath = path.resolve(__dirname, '../../public/CryptoAndTickers.txt');
      const data = fs.readFileSync(filePath, 'utf8');
      return data.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
    } catch (err) {
      console.error("Error loading tickers:", err);
      return [];
    }
  }

  private saveTickers(): void {
    try {
      const filePath = path.resolve(__dirname, '../../public/Alpaca_Ticker_List.txt');
      fs.writeFileSync(filePath, Array.from(this.tickers).join('\n'));
    } catch (err) {
      console.error("Error saving tickers:", err);
    }
  }

  public getAllTickers(): string[] {
    return Array.from(this.tickers);
  }

  public addTicker(ticker: string): void {
    this.tickers.add(ticker);
    this.saveTickers();
  }

  public removeTicker(ticker: string): void {
    this.tickers.delete(ticker);
    this.saveTickers();
  }

  public async fetchHistoricalData(ticker: string): Promise<any[]> {
    const endDate = Math.floor(new Date().getTime() / 1000);
    const startDate = endDate - 60 * 60 * 24 * 70;  // Last 70 days in seconds
    const queryOptions = { period1: startDate, period2: endDate, interval: '1d' as '1d' };
    try {
      const result = await yahooFinance.historical(ticker, queryOptions);
      return result;
    } catch (error) {
      console.error(`Error fetching data for ticker ${ticker}:`, error);
      throw new Error(`Could not fetch historical data for ticker ${ticker}`);
    }
  }

  public async fetchIntervalHistoricalData(ticker: string, scale: '7d' | '30d' | '3mo'): Promise<any[]> {
    const endDate = Math.floor(new Date().getTime() / 1000);
    let startDate: number;

    switch (scale) {
        case '7d':
            startDate = endDate - 60 * 60 * 24 * 7 * 1.5;
            break;
        case '30d':
            startDate = endDate - 60 * 60 * 24 * 30 * 1.5;
            break;
        case '3mo':
            startDate = endDate - 60 * 60 * 24 * 90 * 1.6;
            break;
        default:
            throw new Error('Invalid scale');
    }

    const queryOptions = {
        period1: startDate,
        period2: endDate,
        interval: '1d' as '1d'
    };

    try {
        const result = await yahooFinance.historical(ticker, queryOptions);
        return result;
    } catch (error) {
        console.error(`Error fetching data for ticker ${ticker}:`, error);
        throw new Error(`Could not fetch historical data for ticker ${ticker}`);
    }
}

  

  public async getFundamentalData(ticker: string): Promise<any> {
    try { const summary = await yahooFinance.quoteSummary(ticker, { modules: ['financialData', 'summaryDetail', 'defaultKeyStatistics']});
    return summary;
  } catch (error) {
    console.error(`Error fetching fundamental data ${ticker}:`, error);
    throw new Error('Could not fetch fundamental data for ticker ${ticker}');
  }}

  public async postFundamentalData(ticker: string): Promise<any> {
    const data = await this.getFundamentalData(ticker);
    const peRatio = data.financialData.currentPrice / data.defaultKeyStatistics.trailingEps;
    const pegRatio = data.defaultKeyStatistics.pegRatio;
    const dividendYield = data.summaryDetail.dividendYield;
    const payoutRatio = data.summaryDetail.payoutRatio;
    const revenue = data.financialData.totalRevenue;
    const profitMargin = data.financialData.profitMargins;
    const freeCashFlow = data.financialData.freeCashflow;

    await this.db.collection('fundamentalData').updateOne(
      { ticker },
      { $set: { ticker, peRatio, pegRatio, dividendYield, payoutRatio, revenue, profitMargin, freeCashFlow } },
      { upsert: true }
    );

    return {
      ticker,
      peRatio,
      pegRatio,
      dividendYield,
      payoutRatio,
      revenue,
      profitMargin,
      freeCashFlow
    };
  }

  public async getAllFundamentalData(): Promise<any> {
    const promises = Array.from(this.tickers).map(async ticker => {
      try {
        return await this.postFundamentalData(ticker);
      } catch (error) {
        console.error(`Error processing ticker ${ticker}:`, error);
        return null;
      }
    });

    const results = await Promise.all(promises);
    const validResults: Array<{ ticker: string, peRatio: number, pegRatio: number, dividendYield: number, payoutRatio: number, revenue: number, profitMargin: number,
      freeCashFlow: number }> = results.filter(result => result !== null) as Array<{ ticker: string, peRatio: number, pegRatio: number, dividendYield: number, payoutRatio: number, revenue: number, profitMargin: number,
      freeCashFlow: number }>;
    return validResults;}


  public calculateSMA(data: number[], period: number): number {
    const slice = data.slice(-period);
    const average = slice.reduce((acc, val) => acc + val, 0) / period;
    return average;
  }

  public calculateEMA(data: number[], period: number): number {
    const k = 2 / (period + 1);
    const initialSMA = this.calculateSMA(data.slice(0, period), period); // Calculate the initial SMA for the first `period` data points
    let ema = initialSMA;

    for (let i = period; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }

    return ema;
  }

  public calculateRSI(data: number[], period: number): number {
    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const difference = data[i] - data[i - 1];
      if (difference >= 0) {
        gains += difference;
      } else {
        losses -= difference;
      }
    }

    let averageGain = gains / period;
    let averageLoss = losses / period;

    for (let i = period + 1; i < data.length; i++) {
      const difference = data[i] - data[i - 1];
      if (difference >= 0) {
        averageGain = (averageGain * (period - 1) + difference) / period;
        averageLoss = (averageLoss * (period - 1)) / period;
      } else {
        averageGain = (averageGain * (period - 1)) / period;
        averageLoss = (averageLoss * (period - 1) - difference) / period;
      }
    }

    const relativeStrength = averageGain / averageLoss;
    const rsi = 100 - (100 / (1 + relativeStrength));

    return rsi;
  }

  public async getTechnicalData(ticker: string): Promise<{ ticker: string, sma50: number, sma20: number, ema50: number, ema20: number, rsi14: number }> {
    const data = await this.fetchHistoricalData(ticker);
    const closePrices = data.map(day => day.close);
    const sma50 = this.calculateSMA(closePrices, 50); // 50-day SMA
    const sma20 = this.calculateSMA(closePrices, 20); // 20-day SMA
    const ema50 = this.calculateEMA(closePrices, 50); // 50-day EMA
    const ema20 = this.calculateEMA(closePrices, 20); // 20-day EMA
    const rsi14 = this.calculateRSI(closePrices, 14); // 14-day RSI

    await this.db.collection('technicalData').updateOne(
      { ticker },
      { $set: { ticker, sma50, sma20, ema50, ema20, rsi14 } },
      { upsert: true }
    );

    return { ticker, sma50, sma20, ema50, ema20, rsi14 };
  }

  public async getIntervalTechnicalData(ticker: string, scale: '7d' | '30d' | '3mo'): Promise<any> {
    const data = await this.fetchIntervalHistoricalData(ticker, scale);
    const closePrices = data.map(day => day.close);
    const technicalIndicators = {
        sma50: this.calculateSMA(closePrices, 50),
        sma20: this.calculateSMA(closePrices, 20),
        ema50: this.calculateEMA(closePrices, 50),
        ema20: this.calculateEMA(closePrices, 20),
        rsi14: this.calculateRSI(closePrices, 14),
    };

    return { ticker, scale, technicalIndicators };
  }

  public async getAllTechnicalData(): Promise<Array<{ ticker: string, sma50: number, sma20: number, ema50: number, ema20: number, rsi14: number }>> {
    const promises = Array.from(this.tickers).map(async ticker => {
      try {
        return await this.getTechnicalData(ticker);
      } catch (error) {
        console.error(`Error processing ticker ${ticker}:`, error);
        return null;
      }
    });

    const results = await Promise.all(promises);
    const validResults: Array<{ ticker: string, sma50: number, sma20: number, ema50: number, ema20: number, rsi14: number }> = results.filter(result => result !== null) as Array<{ ticker: string, sma50: number, sma20: number, ema50: number, ema20: number, rsi14: number }>;
    return validResults;
  }

  public async getNewsArticles(ticker: string): Promise<{ title: string, link: string }[]> {
    try {
      const news = await yahooFinance.search(ticker, { newsCount: 5});

      if (!news.news || news.news.length === 0) {
        throw new Error('No news articles found');
      }
      console.log(news)
      return news.news.map(article => ({ title: article.title, link: article.link })); 
    } catch (error) {
      if ((error as any).type === 'invalid-json') {
        console.error(`Error fetching news articles for ${ticker}:`, (error as any).message);
      } else {
        console.error(`Error fetching news articles for ${ticker}:`, error);
      }
      throw new Error(`Could not fetch news articles for ${ticker}`);
    }
  }

  public async fetchArticleContent(url) {
    try {
      // const { data } = await axios.get(url);
      const response = await fetch(url, {
        headers: {
          Accept: 'text/html'
        }
      })
      const text = await response.text();

      const $ = load(text);
      const articleContent: string[] = [];
  
      $('.caas-body p').each((index, element) => {
        articleContent.push($(element).text());
      });
  
      const fullArticle = articleContent.join(' ');
      return fullArticle;
    } catch (error) {
      console.error(`Error fetching article content from ${url}:`, error);
      throw new Error(`Could not fetch article content from ${url}`);
    }
  }

  public async analyzeSentiment(ticker) {
    try {
      const newsArticles = await this.getNewsArticles(ticker);

      const sentimentScores = await Promise.all(newsArticles.map(async ({ title, link }) => {
        const articleContent = await this.fetchArticleContent(link);
        const result = this.sentiment.analyze(articleContent);
        return { title, score: result.score };
      }));

      return sentimentScores;
    } catch (error) {
      console.error(`Error analyzing sentiment for ${ticker}:`, error);
      throw new Error(`Could not analyze sentiment for ${ticker}`);
    }
  }

  public async getAllSentimentData(tickers: string[]): Promise<Array<{ ticker: string, articles: { title: string, score: number }[] }>> {
    const promises = Array.from(tickers).map(async ticker => {
      try {
        const articles = await this.analyzeSentiment(ticker);
        return { ticker, articles };
      } catch (error) {
        console.error(`Error processing ticker ${ticker}:`, error);
        return null;
      }
    });

    const results = await Promise.all(promises);
    const validResults = results.filter(result => result !== null) as Array<{ ticker: string, articles: { title: string, score: number }[] }>;
    return validResults;
  }

  public async analyzeResults(): Promise<AnalysisResult> {
    const technicalResults = await this.db.collection('technicalData').find().toArray();
    const fundamentalResults = await this.db.collection('fundamentalData').find().toArray();
    const longCandidates: Stock[] = [];
    const shortCandidates: Stock[] = [];

    technicalResults.forEach(result => {
      const latestSMA20 = result.sma20;
      const latestSMA50 = result.sma50;
      const latestEMA20 = result.ema20;
      const latestEMA50 = result.ema50;
      const latestRSI14 = result.rsi14;

      const fundamentalResult = fundamentalResults.find(f => f.ticker === result.ticker);
      if (!fundamentalResult) return;

      const peRatio = fundamentalResult.peRatio;
      const pegRatio = fundamentalResult.pegRatio;
      const profitMargin = fundamentalResult.profitMargin;
      const dividendYield = fundamentalResult.dividendYield;
      const payoutRatio = fundamentalResult.payoutRatio;
      const revenue = fundamentalResult.revenue;
      const freeCashFlow = fundamentalResult.freeCashFlow;

      // Criteria for long candidates
      const isTechnicallyLong = latestSMA20 > latestSMA50 && latestEMA20 > latestEMA50 && latestRSI14 > 70;
      const isFundamentallyStrong = peRatio > 0 && peRatio < 30 && pegRatio > 0 && profitMargin > 0 && dividendYield > 0 && payoutRatio > 0 && revenue > 0 && freeCashFlow > 0;

      // Criteria for short candidates
      const isTechnicallyShort = latestSMA20 < latestSMA50 && latestEMA20 < latestEMA50 && latestRSI14 < 30;
      const isFundamentallyWeak = peRatio < 0 || pegRatio < 0 || profitMargin < 0 || dividendYield < 0 || payoutRatio < 0 || revenue < 0 || freeCashFlow < 0;

      if (isTechnicallyLong && isFundamentallyStrong) {
        longCandidates.push({ 
          ticker: result.ticker, 
          sma50: latestSMA50, 
          sma20: latestSMA20, 
          ema50: latestEMA50, 
          ema20: latestEMA20, 
          rsi14: latestRSI14, 
          peRatio: peRatio,
          pegRatio: pegRatio, 
          profitMargin: profitMargin, 
          dividendYield: dividendYield, 
          payoutRatio: payoutRatio, 
          revenue: revenue, 
          freeCashFlow: freeCashFlow
        });
      } else if (isTechnicallyShort && isFundamentallyWeak) {
        shortCandidates.push({ 
          ticker: result.ticker, 
          sma50: latestSMA50, 
          sma20: latestSMA20, 
          ema50: latestEMA50, 
          ema20: latestEMA20, 
          rsi14: latestRSI14, 
          peRatio: peRatio,
          pegRatio: pegRatio, 
          profitMargin: profitMargin, 
          dividendYield: dividendYield, 
          payoutRatio: payoutRatio, 
          revenue: revenue, 
          freeCashFlow: freeCashFlow
        });
      }
    });

    return {
      longCandidates,
      shortCandidates
    };
  }

  public async analyzeWithSentiment(): Promise<void> {
    const { longCandidates, shortCandidates } = await this.analyzeResults();
    const sentimentData = await this.getAllSentimentData(longCandidates.map(c => c.ticker).concat(shortCandidates.map(c => c.ticker)));
  
    // console.log('Long candidates:', longCandidates);
    // console.log('Short candidates:', shortCandidates);
    // console.log('Sentiment data:', sentimentData);
  
    const longCandidatesWithSentiment = longCandidates.map((candidate, index) => {
      const articles = sentimentData[index]?.articles;
      const sentiment = articles ? articles.map(article => article.score).reduce((acc, val) => acc + val, 0) / articles.length : 0;
      if (sentiment > 15) {
        return { ...candidate, sentiment };
      }
      return null;
    });
  
    const shortCandidatesWithSentiment = shortCandidates.map((candidate, index) => {
      const articles = sentimentData[index + longCandidates.length]?.articles;
      const sentiment = articles ? articles.map(article => article.score).reduce((acc, val) => acc + val, 0) / articles.length : 0;
      if (sentiment < 20) {
        return { ...candidate, sentiment };
      }
      return null;
    });

    await this.saveCandidates('longCandidates', longCandidatesWithSentiment);
    await this.saveCandidates('shortCandidates', shortCandidatesWithSentiment);

    console.log("Long candidates: ", longCandidatesWithSentiment);
    console.log("Short candidates: ", shortCandidatesWithSentiment);
    }  

  private async saveCandidates(collectionName: string, candidates: any[]): Promise<void> {
    const collection = this.db.collection(collectionName);
    await collection.deleteMany({});
    await collection.insertMany(candidates);
  }

  public async getCandidatesFromDB(): Promise<{ longCandidates: any[], shortCandidates: any[] }> {
    const longCandidates = await this.db.collection('longCandidates').find().toArray();
    const shortCandidates = await this.db.collection('shortCandidates').find().toArray();
    return { longCandidates, shortCandidates };
  }


  public async fetchRealTimeData(ticker: string): Promise<any> {
    try {
      const quote = await yahooFinance.quote(ticker);
      return quote;
    } catch (error) {
      console.error(`Error fetching real-time data for ticker ${ticker}:`, error);
      throw new Error(`Could not fetch real-time data for ticker ${ticker}`);
    }
  }
}

export default AnalysisService;
