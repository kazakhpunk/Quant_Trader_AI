import { Router } from 'express';
import userRouter from './user/user-router';
import gptRouter from './gpt/gpt-router';
import analysisRouter from './analysis/analysis-router';
import tradeRouter from './trade/trade-router';

const globalRouter = Router();

// Use the userRouter for user-related routes
globalRouter.use(userRouter);
globalRouter.use(gptRouter);
globalRouter.use(analysisRouter);
globalRouter.use(tradeRouter);

// other routers can be added here
export default globalRouter;
