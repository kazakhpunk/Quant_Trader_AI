import { Request, Response } from 'express';
import { Db } from 'mongodb';
import {
  fetchOrders,
  fetchPositions,
  fetchAccount,
  fetchPortfolioHistory,
  PortfolioPeriod,
} from './dash-service';

export const getDashboardData = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];
  const isLive = req.body.isLive;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const [orders, positions, account] = await Promise.all([
      fetchOrders(token, isLive),
      fetchPositions(token, isLive),
      fetchAccount(token, isLive),
    ]);
    res.json({ orders, positions, account });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

export const getPortfolioHistory = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];
  const isLive = !!req.body.isLive;
  const period = (req.body.period as PortfolioPeriod) || '1M';
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const data = await fetchPortfolioHistory(token, isLive, period);
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching portfolio history:', error?.response?.data ?? error?.message);
    res.status(500).json({ error: 'Failed to fetch portfolio history' });
  }
};

/** Account-level P&L history. Backed by Alpaca's
 *  `/v2/account/portfolio/history`, which is the only OAuth-friendly path
 *  for time-series P&L (Alpaca's market-data API rejects OAuth tokens with
 *  40110000 due to IEX/Polygon licensing — confirmed via Alpaca dev forum).
 *  Returns the same { timestamp, pnl, pct, base_value } shape the frontend
 *  expects so the chart code stays unchanged. */
export const makeGetPositionsPnlHistory = (_db: Db) =>
  async (req: Request, res: Response) => {
    const token = req.headers.authorization?.split(' ')[1];
    const isLive = !!req.body.isLive;
    const period = (req.body.period as PortfolioPeriod) || '1M';
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    try {
      const data = await fetchPortfolioHistory(token, isLive, period);

      // Alpaca returns parallel arrays. profit_loss is in dollars,
      // profit_loss_pct is a fraction (0.01 = 1%). The frontend
      // displays pct with a '%' suffix as-is, so multiply by 100 here so
      // 0.01 renders as "1.00%" instead of "0.01%".
      const ts = (data.timestamp ?? []) as number[];
      const pnl = ((data.profit_loss ?? []) as number[]).map(
        (v) => +Number(v).toFixed(2),
      );
      const pct = ((data.profit_loss_pct ?? []) as number[]).map(
        (v) => +(Number(v) * 100).toFixed(4),
      );
      const base_value = +Number(data.base_value ?? 0).toFixed(2);

      res.json({ timestamp: ts, pnl, pct, base_value });
    } catch (error: any) {
      console.error(
        'Error fetching positions PnL history:',
        error?.response?.data ?? error?.message,
      );
      res
        .status(500)
        .json({ error: 'Failed to fetch positions P&L history' });
    }
  };
