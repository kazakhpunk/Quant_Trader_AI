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
