import { Router } from 'express';
import { getDashboardData } from './dash-controller';

const router = Router();

router.post('/dashboard-data', getDashboardData);

export default router;
