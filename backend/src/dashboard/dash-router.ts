import { Router } from 'express';
import { Db } from 'mongodb';
import {
  getDashboardData,
  getPortfolioHistory,
  makeGetPositionsPnlHistory,
} from './dash-controller';

export const createDashboardRouter = (db: Db): Router => {
  const router = Router();
  router.post('/dashboard-data', getDashboardData);
  router.post('/portfolio-history', getPortfolioHistory);
  router.post('/positions-pnl-history', makeGetPositionsPnlHistory(db));
  return router;
};

export default createDashboardRouter;
