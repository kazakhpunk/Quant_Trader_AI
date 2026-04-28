import { Router } from "express";
import { Db } from "mongodb";
import { RatingsService } from "./ratings-service";
import { RatingsController } from "./ratings-controller";

export default function createRatingsRouter(db: Db): Router {
  const router = Router();
  const svc = new RatingsService(db);
  const ctrl = new RatingsController(svc);
  router.get("/ratings", ctrl.list);
  router.post("/ratings/refresh", ctrl.refresh);
  return router;
}
