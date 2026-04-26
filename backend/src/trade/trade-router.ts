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
  router.post("/price", tradeController.getLatestPrice);
  router.get("/open?", tradeController.isMarketOpen);
  router.post("/trade/order", tradeController.placeOrder);
  router.post("/positions/close-all", tradeController.closeAllPositions);
  router.post("/orders/cancel-all", tradeController.cancelAllOrders);
  router.post("/positions/list", tradeController.listPositions);
  router.post("/orders/open", tradeController.listOpenOrders);
  router.post("/positions/close", tradeController.closePosition);
  router.post("/orders/cancel", tradeController.cancelOrder);

  return router;
};

export default createTradeRouter;
