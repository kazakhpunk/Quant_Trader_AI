import { Request, Response } from 'express';
import { Db } from 'mongodb';
import {
  fetchOrders,
  fetchPositions,
  fetchAccount,
  fetchPortfolioHistory,
  fetchFilledBuysSince,
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

      // Pull bars + actual open dates in parallel. The open date per
      // symbol is the earliest filled BUY order; we use it to clip each
      // position's chart contribution to $0 before that date. Without
      // this clip the chart simulates owning the position even on dates
      // before the user bought it — so a stock that was higher in the
      // past inflates the early P&L and makes the curve look downward
      // even when current unrealized P&L is positive.
      const [positionData, filledBuys] = await Promise.all([
        Promise.all(
          positions.map(async (p) => {
            try {
              const bars = await fetchBarsSlice(p.symbol, startDate, endDate);
              return { ...p, bars };
            } catch (e: any) {
              console.warn(`[pnl-history] bar fetch failed for ${p.symbol}:`, e?.message);
              return { ...p, bars: [] as { date: string; close: number }[] };
            }
          }),
        ),
        // Look back 10y + paginate so even ancient positions get their
        // open date resolved. Without enough lookback some symbols (e.g.
        // AMD held since 2020) miss the cutoff and end up un-clipped,
        // dominating the chart with simulated past P&L.
        fetchFilledBuysSince(
          token,
          isLive,
          isoDay(new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000)),
        ).catch((e) => {
          console.warn('[pnl-history] filled-buys fetch failed:', e?.message);
          return [] as any[];
        }),
      ]);

      const openDateBySymbol = new Map<string, string>();
      const filledBuysArr: any[] = Array.isArray(filledBuys) ? filledBuys : [];
      for (const o of filledBuysArr) {
        if (String(o?.side ?? '').toLowerCase() !== 'buy') continue;
        if (!o?.filled_at) continue;
        const sym = String(o.symbol);
        const filledAt = String(o.filled_at).slice(0, 10);
        const existing = openDateBySymbol.get(sym);
        if (!existing || filledAt < existing) openDateBySymbol.set(sym, filledAt);
      }
      // Held positions whose buy order we couldn't find — most commonly a
      // very-recent buy that hasn't propagated through /v2/orders yet
      // (e.g. user just bought AMD and Alpaca's order list lags by a few
      // minutes). Default openDate = today so the symbol contributes $0
      // to every past date and only shows its tiny live MTM at the right
      // edge. Better to under-include a recent buy than over-include a
      // mystery symbol's multi-year price history (which would dominate
      // the chart with simulated past P&L from when the stock was high).
      const heldSymbols = positions.map((p) => p.symbol);
      const missingOpenDate = heldSymbols.filter((s) => !openDateBySymbol.has(s));
      if (missingOpenDate.length) {
        const today = isoDay(new Date());
        for (const s of missingOpenDate) openDateBySymbol.set(s, today);
      }

      const dateSet = new Set<string>();
      for (const p of positionData) for (const b of p.bars) dateSet.add(b.date);
      const dates = Array.from(dateSet).sort();
      if (!dates.length) {
        return res.json({ timestamp: [], pnl: [], pct: [], base_value: 0 });
      }

      // Only positions that actually got bars contribute to the chart's pnl
      // line — so the baseline must be computed over the same subset, or
      // pct = pnl / baseline collapses to ~0% (small numerator, oversized
      // denominator) and the chart looks like it's flat at zero.
      const indexed = positionData
        .filter((p) => p.bars.length > 0)
        .map((p) => {
          const byDate = new Map<string, number>();
          for (const b of p.bars) byDate.set(b.date, b.close);
          return {
            ...p,
            byDate,
            sortedDs: Array.from(byDate.keys()).sort(),
            openDate: openDateBySymbol.get(p.symbol),
          };
        });

      // Cost basis is dollars-at-risk; |qty| keeps shorts (negative qty)
      // from subtracting from longs and flipping the % sign relative to $.
      const baseline = indexed.reduce(
        (s, p) => s + Math.abs(p.avgEntryPrice * p.qty),
        0,
      );

      const pnl = dates.map((date) => {
        let total = 0;
        for (const p of indexed) {
          // Position can't contribute P&L before the user actually bought
          // it — clip to $0 on dates earlier than the first filled buy.
          if (p.openDate && date < p.openDate) continue;
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
