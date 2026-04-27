import { Router } from 'express';
import { getDashboardData, getPortfolioHistory } from './dash-controller';

const router = Router();

router.post('/dashboard-data', getDashboardData);
router.post('/portfolio-history', getPortfolioHistory);

export default router;
