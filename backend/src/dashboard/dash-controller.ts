import { Request, Response } from 'express';
import { fetchOrders, fetchPositions, fetchAccount } from './dash-service';

export const getDashboardData = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1]; // Extract Bearer token
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

    const data = {
      orders,
      positions,
      account,
    };

    res.json(data);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};
