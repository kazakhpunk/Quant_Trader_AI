import yahooFinance from 'yahoo-finance2';
import fs from 'fs';
import path from 'path';

// Path to the ticker list file
const filePath = path.resolve(__dirname, '../../public/CRYPTO.txt');
const data = fs.readFileSync(filePath, 'utf8');
const tickers = data.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);

// Function to verify tickers
const verifyTickers = async (tickers: string[]): Promise<string[]> => {
  const validTickers: string[] = [];

  for (const ticker of tickers) {
    try {
      await yahooFinance.quote(ticker);
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
  fs.writeFileSync(path.resolve(__dirname, '../../public/Valid_Crypto.txt'), validTickers.join('\n'), 'utf8');
});
