import { Router } from 'express';
import TradeController from './trade-controller';
import TradeService from './trade-service';
import { Db } from 'mongodb';

const createTradeRouter = async (db: Db) => {
  const router = Router();
  const tradeService = new TradeService(db);
  const tradeController = new TradeController(tradeService);

  router.post('/trade', tradeController.executeTrades);
  router.post('/monitor', tradeController.startMonitoringCronJob); 
  router.post('/update', tradeController.startCombinedCronJob);
  router.get('/price/:ticker', tradeController.getLatestPrice);
  router.get('/open?', tradeController.isMarketOpen);

  return router;
};

export default createTradeRouter;
