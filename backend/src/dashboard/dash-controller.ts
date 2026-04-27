import { Request, Response } from 'express';
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

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

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
    console.error(
      'Error fetching portfolio history:',
      error?.response?.data ?? error?.message
    );
    res.status(500).json({ error: 'Failed to fetch portfolio history' });
  }
};
