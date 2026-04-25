import { Router } from "express";
import TradeController from "./trade-controller";
import TradeService from "./trade-multiuser-service";
import { Db } from "mongodb";

const createTradeRouter = async (db: Db) => {
  const router = Router();

  const tradeService = new TradeService(db);
  await tradeService.setupCentralizedQstash();

  const tradeController = new TradeController(tradeService);

  router.post("/trade", tradeController.executeTrades);
  router.post("/monitor", tradeController.monitorAndManagePositions);
  router.post("/update", tradeController.fetchAndAnalyzeData);
  router.get("/price", tradeController.getLatestPrice);
  router.get("/open?", tradeController.isMarketOpen);
  router.post("/trade/order", tradeController.placeOrder);

  return router;
};

export default createTradeRouter;
