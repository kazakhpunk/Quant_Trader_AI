import YahooFinance from "yahoo-finance2";
import Bottleneck from "bottleneck";

const yahooFinance: any = new (YahooFinance as any)();
yahooFinance.suppressNotices?.(["yahooSurvey"]);

const limiter = new Bottleneck({ minTime: 1500, maxConcurrent: 1 });

type CacheEntry<T> = { value: Promise<T>; expires: number };
const cache = new Map<string, CacheEntry<any>>();

const TTL = {
  chart: 5 * 60 * 1000,
  fundamental: 15 * 60 * 1000,
  quote: 60 * 1000,
  search: 10 * 60 * 1000,
};

function getCached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) return hit.value as Promise<T>;
  const value = limiter.schedule(fetcher).catch((err) => {
    cache.delete(key);
    throw err;
  });
  cache.set(key, { value, expires: now + ttlMs });
  return value;
}

export type Bar = {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose?: number;
};

export async function getHistoricalBars(
  ticker: string,
  period1: number,
  period2: number
): Promise<Bar[]> {
  const key = `chart:${ticker}:${period1}:${period2}`;
  return getCached(key, TTL.chart, async () => {
    const result: any = await yahooFinance.chart(ticker, {
      period1: new Date(period1 * 1000),
      period2: new Date(period2 * 1000),
      interval: "1d",
    });
    return (result?.quotes || [])
      .filter((q: any) => q && q.close != null)
      .map((q: any) => ({
        date: q.date,
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume,
        adjClose: q.adjclose,
      }));
  });
}

export async function getQuoteSummary(ticker: string, modules: any[]): Promise<any> {
  const key = `summary:${ticker}:${modules.join(",")}`;
  return getCached(key, TTL.fundamental, () =>
    yahooFinance.quoteSummary(ticker, { modules })
  );
}

export async function getQuote(ticker: string): Promise<any> {
  const key = `quote:${ticker}`;
  return getCached(key, TTL.quote, () => yahooFinance.quote(ticker) as Promise<any>);
}

export async function searchNews(ticker: string, newsCount = 10): Promise<any> {
  const key = `search:${ticker}:${newsCount}`;
  return getCached(key, TTL.search, () =>
    yahooFinance.search(ticker, { newsCount })
  );
}
