import Bottleneck from 'bottleneck';
import { getHistoricalBars } from '../analysis/yahoo-client';
import { FredObservation } from './fred-client';

export interface YahooClientDeps {
  cacheGet?: (key: string) => Promise<FredObservation[] | null>;
  cacheSet?: (key: string, obs: FredObservation[]) => Promise<void>;
}

/** Wraps the existing analysis-side Yahoo client and emits FRED-shape
 *  observations so the rest of the rv-trade pipeline doesn't care which
 *  upstream the series came from. */
export class YahooSeriesClient {
  private cacheGet: NonNullable<YahooClientDeps['cacheGet']>;
  private cacheSet: NonNullable<YahooClientDeps['cacheSet']>;
  private limiter = new Bottleneck({ minTime: 600 });

  constructor(deps: YahooClientDeps = {}) {
    this.cacheGet = deps.cacheGet ?? (async () => null);
    this.cacheSet = deps.cacheSet ?? (async () => undefined);
  }

  async getSeries(ticker: string, start: string, end: string): Promise<FredObservation[]> {
    const cacheKey = `yh:${ticker}|${start}|${end}`;
    const cached = await this.cacheGet(cacheKey);
    if (cached) return cached;

    const startSec = Math.floor(new Date(start).getTime() / 1000);
    const endSec = Math.floor(new Date(end).getTime() / 1000);
    const bars = await this.limiter.schedule(() => getHistoricalBars(ticker, startSec, endSec));

    const parsed: FredObservation[] = bars
      .map((b) => ({ date: new Date(b.date).toISOString().slice(0, 10), value: b.close }))
      .filter((o) => Number.isFinite(o.value));

    await this.cacheSet(cacheKey, parsed);
    return parsed;
  }
}
