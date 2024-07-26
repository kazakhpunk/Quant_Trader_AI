import axios from 'axios';

const getAlpacaApiUrl = (isLive: boolean) =>
  isLive ? 'https://api.alpaca.markets/v2' : 'https://paper-api.alpaca.markets/v2';

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
