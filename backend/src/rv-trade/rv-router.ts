import { Router } from 'express';
import { Db } from 'mongodb';
import { RvController } from './rv-controller';
import { RvStore } from './rv-store';
import { FredClient } from './fred-client';

export const createRvRouter = (db: Db): Router => {
  const router = Router();
  const store = new RvStore(db);
  const fred = new FredClient(process.env.FRED_API_KEY ?? '', {
    cacheGet: (k) => store.getCachedFred(k, 6 * 60 * 60 * 1000),
    cacheSet: (k, obs) => store.setCachedFred(k, obs),
  });
  const ctl = new RvController(store, fred);

  router.get('/rv/universe',     ctl.getUniverse);
  router.get('/rv/pairs',        ctl.getPairs);
  router.get('/rv/signals',      ctl.getSignals);
  router.post('/rv/signals/refresh', ctl.getSignals);
  router.post('/rv/backtests',   ctl.postBacktest);
  router.get('/rv/backtests',    ctl.listBacktests);
  router.get('/rv/backtests/:id', ctl.getBacktest);
  return router;
};
