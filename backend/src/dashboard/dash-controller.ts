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

/** Account-level P&L over time. Backed by Alpaca's
 *  `/v2/account/portfolio/history` — the same endpoint the original
 *  dashboard chart used (commit ed7e95d) and the only OAuth-friendly
 *  source for P&L time-series. Unlike per-position MTM
 *  (close − avg_entry) × qty, this gives a natural upward equity curve
 *  when the account is making money: each day reflects real account
 *  equity, not a "what if I held current positions all along" simulation. */
export const makeGetPositionsPnlHistory = (_db: Db) =>
  async (req: Request, res: Response) => {
    const token = req.headers.authorization?.split(' ')[1];
    const isLive = !!req.body.isLive;
    const period = (req.body.period as PortfolioPeriod) || '1M';
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    try {
      const data = await fetchPortfolioHistory(token, isLive, period);
      const ts = (data.timestamp ?? []) as number[];
      const pnl = ((data.profit_loss ?? []) as number[]).map(
        (v) => +Number(v).toFixed(2),
      );
      const base_value = +Number(data.base_value ?? 0).toFixed(2);
      // Derive pct from pnl/base_value as a fraction (frontend multiplies
      // by 100 for display). Alpaca's profit_loss_pct field is unreliable
      // on paper accounts — sometimes returns 0 even with non-zero
      // profit_loss — so we compute it ourselves so the % matches the $.
      const pct = pnl.map((v) => (base_value > 0 ? v / base_value : 0));

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
