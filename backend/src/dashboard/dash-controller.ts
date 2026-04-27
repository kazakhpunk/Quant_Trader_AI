import { Request, Response } from 'express';
import { Db } from 'mongodb';
import {
  fetchOrders,
  fetchPositions,
  fetchAccount,
  fetchPortfolioHistory,
  PortfolioPeriod,
} from './dash-service';
import { fetchBarsSlice } from './bar-cache';

const PERIOD_DAYS: Record<string, number> = {
  '1W': 7, '1M': 30, '3M': 90, '1A': 365, all: 365 * 3,
};

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

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

/** Per-position MTM unrealized P&L over time. Sums (close[d] − avg_entry) × qty
 *  across all currently held positions per day. Rightmost bar converges to
 *  the KPI strip's unrealized P&L number. The historical bars come from a
 *  Mongo-persistent per-symbol cache that prefers Alpaca's data API
 *  (with developer key + secret env vars) over Yahoo (which Railway egress
 *  IPs frequently get blocked from). */
export const makeGetPositionsPnlHistory = (db: Db) =>
  async (req: Request, res: Response) => {
    const token = req.headers.authorization?.split(' ')[1];
    const isLive = !!req.body.isLive;
    const period = (req.body.period as string) || '1M';
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');

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
      const endDate = isoDay(new Date());
      const startDate = isoDay(new Date(Date.now() - days * 24 * 60 * 60 * 1000));

      // Direct fetch (Alpaca → Yahoo fallback) per request. Bypasses the
      // Mongo bar-cache which was returning stale partial data — every
      // period was resolving to the same handful of cached bars and the
      // chart looked frozen across period switches.
      const positionData = await Promise.all(
        positions.map(async (p) => {
          try {
            const bars = await fetchBarsSlice(p.symbol, startDate, endDate);
            return { ...p, bars };
          } catch (e: any) {
            console.warn(`[pnl-history] bar fetch failed for ${p.symbol}:`, e?.message);
            return { ...p, bars: [] as { date: string; close: number }[] };
          }
        })
      );

      console.log(
        `[pnl-history] period=${period} positions=${positions.length} ` +
        `with-bars=${positionData.filter(p => p.bars.length).length} ` +
        `bars-per-symbol=${positionData.map(p => `${p.symbol}:${p.bars.length}`).join(',')}`,
      );

      const dateSet = new Set<string>();
      for (const p of positionData) for (const b of p.bars) dateSet.add(b.date);
      const dates = Array.from(dateSet).sort();
      if (!dates.length) {
        return res.json({ timestamp: [], pnl: [], pct: [], base_value: 0 });
      }

      const indexed = positionData.map((p) => {
        const byDate = new Map<string, number>();
        for (const b of p.bars) byDate.set(b.date, b.close);
        return { ...p, byDate, sortedDs: Array.from(byDate.keys()).sort() };
      });

      // Cost basis is dollars-at-risk; |qty| keeps shorts (negative qty)
      // from subtracting from longs and flipping the % sign relative to $.
      const baseline = positions.reduce(
        (s, p) => s + Math.abs(p.avgEntryPrice * p.qty),
        0,
      );

      const pnl = dates.map((date) => {
        let total = 0;
        for (const p of indexed) {
          let close = p.byDate.get(date);
          if (close == null) {
            for (let i = p.sortedDs.length - 1; i >= 0; i--) {
              if (p.sortedDs[i] <= date) {
                close = p.byDate.get(p.sortedDs[i]);
                break;
              }
            }
          }
          if (close == null) continue;
          // (close - entry) × qty — Alpaca's qty is negative for shorts so
          // the sign comes out right naturally (short profits when price falls).
          total += (close - p.avgEntryPrice) * p.qty;
        }
        return +total.toFixed(2);
      });

      res.json({
        timestamp: dates.map((d) => Math.floor(new Date(d).getTime() / 1000)),
        pnl,
        // pct is a fraction (0.0092 = 0.92%). The frontend multiplies by
        // 100 in pnl-chart.tsx — don't pre-multiply here or the display
        // shows 100× the real percent (e.g. 1.8% → "180%").
        pct: pnl.map((v) => (baseline > 0 ? v / baseline : 0)),
        base_value: +baseline.toFixed(2),
      });
    } catch (error: any) {
      console.error('Error fetching positions PnL history:', error?.response?.data ?? error?.message);
      res.status(500).json({ error: 'Failed to fetch positions P&L history' });
    }
  };
