import axios from "axios";
import AnalysisService from "../analysis/analysis-service";
import AuthService from "../auth/auth-service";
import { Stock } from "../analysis/types/analysisModel";
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

  public async monitorAndManagePositions(
    email: string,
    isLive: boolean
  ): Promise<void> {
    try {
      const accessToken = await this.getAccessToken(email);
      if (!accessToken) throw new Error("Access token is missing");

      const apiUrl = this.getApiBaseUrl(isLive);

      const response = await axios.get(`${apiUrl}/positions`, {
        headers: {
          // 'APCA-API-KEY-ID': isLive ? process.env.LIVE_API_KEY : process.env.PAPER_API_KEY,
          // 'APCA-API-SECRET-KEY': isLive ? process.env.LIVE_SECRET_KEY : process.env.PAPER_SECRET_KEY,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      const positions = response.data;

      for (const position of positions) {
        const { symbol, qty, avg_entry_price, side } = position;
        const latestPrice = await this.getLatestPrice(symbol, email, isLive);

        const stopLossThreshold = 0.99; // Example: 1% below entry price
        const takeProfitThreshold = 1.03; // Example: 3% above entry price

        const stopLossPrice = parseFloat(avg_entry_price) * stopLossThreshold;
        const takeProfitPrice =
          parseFloat(avg_entry_price) * takeProfitThreshold;

        if (latestPrice <= stopLossPrice) {
          await this.limiter.schedule(() =>
            axios.post(
              `${apiUrl}/orders`,
              {
                symbol,
                qty,
                side: "sell",
                type: "market",
                time_in_force: "day",
              },
              {
                headers: {
                  // 'APCA-API-KEY-ID': isLive ? process.env.LIVE_API_KEY : process.env.PAPER_API_KEY,
                  // 'APCA-API-SECRET-KEY': isLive ? process.env.LIVE_SECRET_KEY : process.env.PAPER_SECRET_KEY,
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
              }
            )
          );
          console.log(
            `Stop-loss order placed for ${symbol} at ${stopLossPrice}`
          );
        }

        if (latestPrice >= takeProfitPrice) {
          await this.limiter.schedule(() =>
            axios.post(
              `${apiUrl}/orders`,
              {
                symbol,
                qty,
                side: "sell",
                type: "market",
                time_in_force: "day",
              },
              {
                headers: {
                  // 'APCA-API-KEY-ID': isLive ? process.env.LIVE_API_KEY : process.env.PAPER_API_KEY,
                  // 'APCA-API-SECRET-KEY': isLive ? process.env.LIVE_SECRET_KEY : process.env.PAPER_SECRET_KEY,
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
              }
            )
          );
          console.log(
            `Take-profit order placed for ${symbol} at ${takeProfitPrice}`
          );
        }
      }
    } catch (error) {
      console.error("Error monitoring and managing positions:", error);
    }
  }

  public async executeTrades(
    amount: string,
    email: string,
    isLive: boolean,
    isSentimentEnabled: boolean
  ): Promise<{ longCandidates: any[]; shortCandidates: any[] }> {
    await this.checkAccountBalance(email, parseFloat(amount), isLive); // Check account balance before trading
    const { longCandidates, shortCandidates } =
      await this.analysisService.getCandidatesFromDB();
    console.log("Long candidates:", longCandidates);
    console.log("Short candidates:", shortCandidates);

    const totalTradingAmount = parseInt(amount); // Example amount in dollars

    const longAllocation =
      totalTradingAmount / (longCandidates.length + shortCandidates.length);
    const shortAllocation =
      totalTradingAmount / (longCandidates.length + shortCandidates.length);

    const tradeCandidates = async (
      candidates: Stock[],
      allocation: number,
      isLong: boolean
    ) => {
      for (const candidate of candidates) {
        if (!isSentimentEnabled || (candidate.sentiment ?? 1) > 0.5) {
          const symbol = candidate.ticker;
          const price = await this.getLatestPrice(symbol, email, isLive);
          const quantity = parseFloat((allocation / price).toFixed(2));

          await this.placeSimpleOrder(symbol, quantity, isLong, email, isLive);
        }
      }
    };

    await tradeCandidates(longCandidates, longAllocation, true);
    await tradeCandidates(shortCandidates, shortAllocation, false);

    await this.startQstash(email, isLive);

    return { longCandidates, shortCandidates };
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

      const response = await qstash.schedules.create({
        destination: `${apiUrl}/api/v1/monitor`,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, isLiveTrading }),
        cron: "0 * * * *", // Run every hour
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
    cron: string
  ): Promise<boolean> {
    try {
      const schedules = await qstash.schedules.list();
      return schedules.some(
        (schedule) =>
          schedule.destination === destination && schedule.cron === cron
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
