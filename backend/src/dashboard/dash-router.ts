import { Router } from 'express';
import {
  getDashboardData,
  getPortfolioHistory,
  getPositionsPnlHistory,
} from './dash-controller';

const router = Router();

router.post('/dashboard-data', getDashboardData);
router.post('/portfolio-history', getPortfolioHistory);
router.post('/positions-pnl-history', getPositionsPnlHistory);

export default router;
