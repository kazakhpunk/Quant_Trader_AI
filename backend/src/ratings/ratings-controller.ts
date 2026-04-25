import { Request, Response } from "express";
import { RatingsService } from "./ratings-service";

export class RatingsController {
  constructor(private svc: RatingsService) {
    this.list = this.list.bind(this);
  }

  async list(_req: Request, res: Response): Promise<void> {
    try {
      const rows = await this.svc.getAll();
      res.status(200).json(rows);
    } catch (err: any) {
      console.error("ratings list error", err);
      res.status(500).json({ error: err.message });
    }
  }
}
