import { Db } from 'mongodb';
import axios from 'axios';
import { getHistoricalBars } from '../analysis/yahoo-client';

/** Incremental Mongo cache of daily close prices per symbol.
 *
 *  Stored shape per ticker:
 *    {
 *      _id: <symbol>,
 *      bars: { date: 'YYYY-MM-DD', close: number }[],   // ascending by date
 *      earliestDate: 'YYYY-MM-DD',
 *      latestDate:   'YYYY-MM-DD',
 *      updatedAt: ISO string,
 *    }
 *
 *  On lookup for a [startDate, endDate] window:
 *    - if cache has bars covering [startDate, latestDate] and latestDate is
 *      yesterday or later → serve straight from cache, skipping today's bar
 *      (price moves intraday) and re-fetching just the [latestDate, today]
 *      tail
 *    - if cache exists but only covers up through some older date →
 *      fetch only the missing tail [latestDate+1, today]
 *    - if cache covers a narrower window than asked → backfill the missing
 *      head separately
 *    - if no cache exists → full fetch
 *
 *  Either way Yahoo only sees the bars that aren't already known. For the
 *  next-day-update case the user described, that's typically 1-2 bars
 *  instead of weeks/months.
 */

const COLLECTION = 'dashboard_bar_cache';

interface CachedDoc {
  _id: string;
  bars: { date: string; close: number }[];
  earliestDate: string;
  latestDate: string;
  updatedAt: string;
}

const isoDay = (input: Date | string | number): string =>
  new Date(input).toISOString().slice(0, 10);

const tsForDay = (day: string): number =>
  Math.floor(new Date(day + 'T00:00:00Z').getTime() / 1000);

const todayIso = () => isoDay(new Date());

function inWindow(d: string, start: string, end: string) {
  return d >= start && d <= end;
}

async function fetchYahooSlice(
  symbol: string,
  startDate: string,
  endDate: string
): Promise<{ date: string; close: number }[]> {
  const start = tsForDay(startDate);
  // pad end by 1 day so we don't miss today's bar
  const end = tsForDay(endDate) + 24 * 60 * 60;
  const bars = await getHistoricalBars(symbol, start, end);
  return bars
    .map((b) => ({ date: isoDay(b.date), close: b.close }))
    .filter((b) => Number.isFinite(b.close));
}

/** Alpaca's market-data API. Uses developer API key + secret (NOT user
 *  OAuth tokens — those are rejected with code 40110000 due to
 *  IEX/Polygon licensing). Works from any IP, unlike Yahoo which Railway's
 *  egress IPs frequently get blocked from. Set APCA_API_KEY_ID +
 *  APCA_API_SECRET_KEY env vars on the server (free Alpaca developer
 *  account at https://app.alpaca.markets/account/api-keys). */
async function fetchAlpacaSlice(
  symbol: string,
  startDate: string,
  endDate: string,
  apiKey: string,
  apiSecret: string,
): Promise<{ date: string; close: number }[]> {
  const out: { date: string; close: number }[] = [];
  let pageToken: string | undefined;
  do {
    const r: any = await axios.get(
      `https://data.alpaca.markets/v2/stocks/${encodeURIComponent(symbol)}/bars`,
      {
        headers: {
          'APCA-API-KEY-ID': apiKey,
          'APCA-API-SECRET-KEY': apiSecret,
        },
        params: {
          timeframe: '1Day',
          start: `${startDate}T00:00:00Z`,
          end: `${endDate}T23:59:59Z`,
          limit: 10000,
          adjustment: 'all',
          feed: 'iex',
          ...(pageToken ? { page_token: pageToken } : {}),
        },
      },
    );
    const bars = r.data?.bars || [];
    for (const b of bars) {
      const close = Number(b.c);
      if (!Number.isFinite(close)) continue;
      out.push({ date: isoDay(b.t), close });
    }
    pageToken = r.data?.next_page_token;
  } while (pageToken);
  return out;
}

/** Try Alpaca's data API first (reliable from Railway, requires developer
 *  key+secret env vars), fall back to Yahoo (works locally / if Alpaca env
 *  vars aren't configured). */
export async function fetchBarsSlice(
  symbol: string,
  startDate: string,
  endDate: string,
): Promise<{ date: string; close: number }[]> {
  const apiKey = process.env.APCA_API_KEY_ID;
  const apiSecret = process.env.APCA_API_SECRET_KEY;
  if (apiKey && apiSecret) {
    try {
      const bars = await fetchAlpacaSlice(symbol, startDate, endDate, apiKey, apiSecret);
      if (bars.length) return bars;
    } catch (e: any) {
      console.warn(
        `[bar-cache] alpaca slice failed for ${symbol}:`,
        e?.response?.status,
        e?.response?.data?.message ?? e?.message,
      );
    }
  }
  return fetchYahooSlice(symbol, startDate, endDate);
}

function mergeBars(
  existing: { date: string; close: number }[],
  incoming: { date: string; close: number }[]
): { date: string; close: number }[] {
  if (!incoming.length) return existing;
  const byDate = new Map<string, number>();
  for (const b of existing) byDate.set(b.date, b.close);
  for (const b of incoming) byDate.set(b.date, b.close); // newer wins (overwrites today's bar)
  return Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, close]) => ({ date, close }));
}

export async function getCachedDailyBars(
  db: Db,
  symbol: string,
  startDate: string,
  endDate: string,
): Promise<{ date: string; close: number }[]> {
  const col = db.collection(COLLECTION);
  const cached = (await col.findOne({ _id: symbol as any })) as CachedDoc | null;
  const today = todayIso();

  if (cached && cached.bars?.length) {
    const headMissing = cached.earliestDate > startDate;
    const tailMissing = cached.latestDate < endDate; // also re-fetches today

    let merged = cached.bars;
    let didBackfill = false;

    // Critical: each backfill is wrapped individually. If Yahoo throws (rate
    // limit, region block from Railway IPs, transient network), we keep what
    // we have rather than blowing up the whole request — that was masking
    // the period selector by collapsing every period to "no data" and the
    // chart looked identical across selections.
    if (headMissing) {
      try {
        const slice = await fetchBarsSlice(symbol, startDate, cached.earliestDate);
        if (slice.length) {
          merged = mergeBars(slice, merged);
          didBackfill = true;
        }
      } catch (e) {
        console.warn(`[bar-cache] head backfill failed for ${symbol}:`, (e as Error).message);
      }
    }
    if (tailMissing) {
      try {
        // start one day before latestDate so today's bar (if newer) overwrites
        // any provisional value from a prior intraday hit
        const tailStart = cached.latestDate;
        const tailEnd = endDate > today ? today : endDate;
        const slice = await fetchBarsSlice(symbol, tailStart, tailEnd);
        if (slice.length) {
          merged = mergeBars(merged, slice);
          didBackfill = true;
        }
      } catch (e) {
        console.warn(`[bar-cache] tail backfill failed for ${symbol}:`, (e as Error).message);
      }
    }

    if (didBackfill) {
      const earliest = merged[0].date;
      const latest = merged[merged.length - 1].date;
      await col.updateOne(
        { _id: symbol as any },
        {
          $set: {
            _id: symbol,
            bars: merged,
            earliestDate: earliest,
            latestDate: latest,
            updatedAt: new Date().toISOString(),
          },
        },
        { upsert: true }
      );
    }

    return merged.filter((b) => inWindow(b.date, startDate, endDate));
  }

  // No cache: full fetch. Wrap so a Yahoo failure doesn't cascade into the
  // controller's catch (which would zero the symbol out).
  let bars: { date: string; close: number }[] = [];
  try {
    bars = await fetchBarsSlice(symbol, startDate, endDate);
  } catch (e) {
    console.warn(`[bar-cache] cold fetch failed for ${symbol}:`, (e as Error).message);
  }
  if (bars.length) {
    await col.updateOne(
      { _id: symbol as any },
      {
        $set: {
          _id: symbol,
          bars,
          earliestDate: bars[0].date,
          latestDate: bars[bars.length - 1].date,
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );
  }
  return bars.filter((b) => inWindow(b.date, startDate, endDate));
}
