import { Db } from "mongodb";
import { DIMENSIONS, Dimension, DimensionScores, RatingRow } from "./ratings-types";

const clamp01 = (n: number): number => Math.max(0, Math.min(100, n));

export function computeComposite(scores: DimensionScores): number {
  const sum = DIMENSIONS.reduce((acc, d) => acc + clamp01(scores[d]), 0);
  return Math.round(sum / DIMENSIONS.length);
}

export class RatingsService {
  constructor(private db: Db) {}

  async getAll(): Promise<RatingRow[]> {
    // Implemented in Task 2
    return [];
  }
}
