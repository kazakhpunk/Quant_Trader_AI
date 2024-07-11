import { Router } from 'express';
import userRouter from './user/user-router';
// import createGptRouter from './gpt/gpt-router';
import createAnalysisRouter from './analysis/analysis-router';
import createTradeRouter from './trade/trade-router';
import messageRouter from './message/message-router';
import { Db } from 'mongodb';

const createGlobalRouter = async (db: Db) => {
  const router = Router();

  const tradeRouter = await createTradeRouter(db);
  const analysisRouter = await createAnalysisRouter(db);

  router.use(analysisRouter);
  router.use(tradeRouter);
  router.use(messageRouter);

  return router;
};

export default createGlobalRouter;
