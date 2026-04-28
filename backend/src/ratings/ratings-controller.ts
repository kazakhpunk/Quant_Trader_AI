import { Request, Response } from "express";
import { RatingsService } from "./ratings-service";
import { memoize } from "../lib/response-cache";

// Process-level memo on top of the Mongo daily snapshot — one snapshot read
// per ~5 min instead of one per request. Cleared automatically when the
// process restarts; survives restarts via the snapshot collection.
const CACHE_MS = 5 * 60 * 1000;

export class RatingsController {
  constructor(private svc: RatingsService) {
    this.list = this.list.bind(this);
    this.refresh = this.refresh.bind(this);
  }

  async list(_req: Request, res: Response): Promise<void> {
    try {
      const rows = await memoize("ratings:list", CACHE_MS, () => this.svc.getCached());
      res.status(200).json(rows);
    } catch (err: any) {
      console.error("ratings list error", err);
      res.status(500).json({ error: err.message });
    }
  }

  /** Force-recompute today's snapshot. Wire this into the daily /update job
   *  so the snapshot is fresh before the first page load each morning. */
  async refresh(_req: Request, res: Response): Promise<void> {
    try {
      const rows = await this.svc.refreshSnapshot();
      res.status(200).json({ ok: true, count: rows.length });
    } catch (err: any) {
      console.error("ratings refresh error", err);
      res.status(500).json({ error: err.message });
    }
  }
}
