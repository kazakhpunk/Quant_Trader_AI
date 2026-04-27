import { Request, Response } from 'express';
import {
  fetchOrders,
  fetchPositions,
  fetchAccount,
  fetchPortfolioHistory,
  PortfolioPeriod,
} from './dash-service';
import { getHistoricalBars } from '../analysis/yahoo-client';

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

const PERIOD_DAYS: Record<string, number> = {
  '1W': 7, '1M': 30, '3M': 90, '1A': 365, all: 365 * 3,
};

/** Per-position MTM P&L over time. Walks each currently-held position
 *  through Yahoo's historical close prices and sums
 *  (close[d] − avg_entry_price) × qty across all positions per day.
 *  Converges to the KPI strip's unrealized-PnL number at the rightmost
 *  bar by construction. */
export const getPositionsPnlHistory = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];
  const isLive = !!req.body.isLive;
  const period = (req.body.period as string) || '1M';
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const positionsRaw = await fetchPositions(token, isLive);
    const positions = (positionsRaw ?? [])
      .map((p: any) => ({
        symbol: String(p.symbol),
        qty: Number(p.qty),
        avgEntryPrice: Number(p.avg_entry_price),
      }))
      .filter((p) => Number.isFinite(p.qty) && Number.isFinite(p.avgEntryPrice));

    if (!positions.length) {
      return res.json({ timestamp: [], pnl: [], pct: [], base_value: 0 });
    }

    const days = PERIOD_DAYS[period] ?? 30;
    const endTs = Math.floor(Date.now() / 1000);
    const startTs = endTs - days * 24 * 60 * 60;

    // Fetch historical bars for every held symbol; tolerate per-symbol failures.
    const positionData = await Promise.all(
      positions.map(async (p) => {
        try {
          const bars = await getHistoricalBars(p.symbol, startTs, endTs);
          return { ...p, bars };
        } catch {
          return { ...p, bars: [] as { date: Date; close: number }[] };
        }
      })
    );

    // Union of all observation dates across positions, sorted ascending.
    const dateSet = new Set<string>();
    for (const p of positionData) {
      for (const b of p.bars) {
        dateSet.add(new Date(b.date).toISOString().slice(0, 10));
      }
    }
    const dates = Array.from(dateSet).sort();
    if (!dates.length) {
      return res.json({ timestamp: [], pnl: [], pct: [], base_value: 0 });
    }

    // Pre-index each position's bars by ISO date so the per-day loop is cheap.
    const indexed = positionData.map((p) => {
      const byDate = new Map<string, number>();
      for (const b of p.bars) {
        byDate.set(new Date(b.date).toISOString().slice(0, 10), b.close);
      }
      const sortedDs = Array.from(byDate.keys()).sort();
      return { ...p, byDate, sortedDs };
    });

    const baseline = positions.reduce(
      (s, p) => s + p.avgEntryPrice * p.qty,
      0
    );

    const pnl: number[] = dates.map((date) => {
      let total = 0;
      for (const p of indexed) {
        // Find latest known close at or before this date (forward-fill gaps).
        let close = p.byDate.get(date);
        if (close == null) {
          // Binary-style search via the sorted list.
          for (let i = p.sortedDs.length - 1; i >= 0; i--) {
            if (p.sortedDs[i] <= date) {
              close = p.byDate.get(p.sortedDs[i]);
              break;
            }
          }
        }
        if (close == null) continue;
        total += (close - p.avgEntryPrice) * p.qty;
      }
      return +total.toFixed(2);
    });

    res.json({
      timestamp: dates.map((d) => Math.floor(new Date(d).getTime() / 1000)),
      pnl,
      pct: pnl.map((v) => (baseline > 0 ? v / baseline : 0)),
      base_value: +baseline.toFixed(2),
    });
  } catch (error: any) {
    console.error(
      'Error fetching positions PnL history:',
      error?.response?.data ?? error?.message
    );
    res.status(500).json({ error: 'Failed to fetch positions P&L history' });
  }
};
