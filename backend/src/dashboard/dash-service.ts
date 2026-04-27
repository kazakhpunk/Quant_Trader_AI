import axios from "axios";

const getAlpacaApiUrl = (isLive: boolean) =>
  isLive
    ? "https://api.alpaca.markets/v2"
    : "https://paper-api.alpaca.markets/v2";

const getAlpacaHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

export const fetchOrders = async (token: string, isLive: boolean) => {
  const response = await axios.get(`${getAlpacaApiUrl(isLive)}/orders`, {
    headers: getAlpacaHeaders(token),
  });
  return response.data;
};

/** Paginated fetch of all filled orders since `afterIsoDate`. Alpaca caps
 *  /v2/orders at 500 per response, so we walk forward by setting the next
 *  page's `after` to the previous page's last filled_at. Used to resolve
 *  open dates for held symbols so the P&L chart can clip pre-open dates
 *  to $0. Lookback is set wide upstream (10y) since some positions can
 *  predate any shorter window.
 *
 *  Note on the `after` param: Alpaca expects RFC 3339 (full ISO datetime
 *  with `T...Z`), not date-only — date-only values come back rejected.
 *  We auto-promote a date string to start-of-day-UTC. */
export const fetchFilledBuysSince = async (
  token: string,
  isLive: boolean,
  afterIsoDate: string,
) => {
  const url = `${getAlpacaApiUrl(isLive)}/orders`;
  const baseParams: Record<string, string | number> = {
    status: 'filled',
    limit: 500,
    direction: 'asc',
  };
  let cursor = afterIsoDate.includes('T') ? afterIsoDate : `${afterIsoDate}T00:00:00Z`;
  const all: any[] = [];
  for (let page = 0; page < 10; page++) {
    try {
      const response = await axios.get(url, {
        headers: getAlpacaHeaders(token),
        params: { ...baseParams, after: cursor },
      });
      const arr: any[] = Array.isArray(response.data) ? response.data : [];
      if (!arr.length) break;
      all.push(...arr);
      // Step the cursor to just after the last filled_at we got, so the
      // next page picks up where this one ended. If the page wasn't full,
      // we've drained the history.
      if (arr.length < (baseParams.limit as number)) break;
      const lastFilledAt = arr[arr.length - 1]?.filled_at;
      if (!lastFilledAt) break;
      cursor = String(lastFilledAt);
    } catch (e: any) {
      console.warn(
        '[fetchFilledBuysSince] page', page, 'failed',
        'status=', e?.response?.status,
        'message=', e?.response?.data?.message ?? e?.message,
      );
      break;
    }
  }
  return all;
};

export const fetchPositions = async (token: string, isLive: boolean) => {
  const response = await axios.get(`${getAlpacaApiUrl(isLive)}/positions`, {
    headers: getAlpacaHeaders(token),
  });
  return response.data;
};

export const fetchAccount = async (token: string, isLive: boolean) => {
  const response = await axios.get(`${getAlpacaApiUrl(isLive)}/account`, {
    headers: getAlpacaHeaders(token),
  });
  return response.data;
};

export type PortfolioPeriod = "1W" | "1M" | "3M" | "1A" | "all";

/** Proxies Alpaca GET /v2/account/portfolio/history. Returns parallel arrays
 *  of timestamps + equity + cumulative PnL since the period's base. */
export const fetchPortfolioHistory = async (
  token: string,
  isLive: boolean,
  period: PortfolioPeriod = "1M"
) => {
  // Daily timeframe up to 1A; 5Min for 1W which is what Alpaca recommends.
  const timeframe = period === "1W" ? "1H" : "1D";
  const response = await axios.get(
    `${getAlpacaApiUrl(isLive)}/account/portfolio/history`,
    {
      headers: getAlpacaHeaders(token),
      params: { period, timeframe, extended_hours: false },
    }
  );
  return response.data;
};
