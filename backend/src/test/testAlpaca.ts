import Alpaca from '@alpacahq/alpaca-trade-api';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Path to the ticker list file
const filePath = path.resolve(__dirname, '../../public/Valid_Ticker_List.txt');
const data = fs.readFileSync(filePath, 'utf8');
const tickers = data.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);

// Alpaca API configuration
const API_KEY = process.env.PAPER_API_KEY;
const API_SECRET = process.env.PAPER_SECRET_KEY;
const BASE_URL = 'https://paper-api.alpaca.markets';

const alpaca = new Alpaca({
  keyId: API_KEY,
  secretKey: API_SECRET,
  paper: true,
  usePolygon: false,
});

// Function to verify tickers
const verifyTickers = async (tickers: string[]): Promise<string[]> => {
  const validTickers: string[] = [];

  for (const ticker of tickers) {
    try {
      await alpaca.getLatestTrade(ticker);
      validTickers.push(ticker);
    } catch (error) {
      console.error(`Invalid ticker: ${ticker}`);
    }
  }

  return validTickers;
};

// Verify the tickers and write valid ones to a file
verifyTickers(tickers).then(validTickers => {
  console.log('Valid Tickers:', validTickers);
  fs.writeFileSync(path.resolve(__dirname, '../../public/Alpaca_Ticker_List.txt'), validTickers.join('\n'), 'utf8');
});
