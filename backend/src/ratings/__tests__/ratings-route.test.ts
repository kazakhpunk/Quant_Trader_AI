import express from "express";
import request from "supertest";
import createRatingsRouter from "../ratings-router";

const fakeDb = {
  collection: () => ({
    find: () => ({ toArray: async () => [] }),
  }),
} as any;

describe("GET /ratings", () => {
  const app = express();
  app.use(express.json());
  app.use("/api/v1", createRatingsRouter(fakeDb));

  it("returns 200 + array", async () => {
    const res = await request(app).get("/api/v1/ratings");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
