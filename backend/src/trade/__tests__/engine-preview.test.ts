import TradeService from "../trade-multiuser-service";
import { DEFAULT_CAPS } from "../trade-types";

describe("previewTrades", () => {
  const fakeDb = { collection: () => ({}) } as any;
  const svc = new TradeService(fakeDb);

  // stub dependencies
  (svc as any).analysisService = {
    getCandidatesFromDB: async () => ({
      longCandidates: [
        { ticker: "NVDA", sentiment: 0.9 },
        { ticker: "MSFT", sentiment: 0.8 },
        { ticker: "AAPL", sentiment: 0.7 },
      ],
      shortCandidates: [],
    }),
  };
  (svc as any).getLatestPrice = async () => 100;
  (svc as any).getAccessToken = async () => "t";
  (svc as any).getCurrentHoldings = async () => new Set<string>();

  it("respects maxPositions cap", async () => {
    const preview = await svc.previewTrades({
      email: "u@x.com",
      amount: 1000,
      isLiveTrading: false,
      isSentimentEnabled: true,
      caps: { ...DEFAULT_CAPS, maxPositions: 2 },
    });
    expect(preview.rows.length).toBe(2);
  });

  it("caps each allocation at maxPositionPct of total", async () => {
    const preview = await svc.previewTrades({
      email: "u@x.com",
      amount: 1000,
      isLiveTrading: false,
      isSentimentEnabled: true,
      caps: { ...DEFAULT_CAPS, maxPositionPct: 20, maxPositions: 10 },
    });
    for (const r of preview.rows) {
      expect(r.allocation).toBeLessThanOrEqual(200.0001);
    }
  });

  it("skips held names when skipHeld is true", async () => {
    (svc as any).getCurrentHoldings = async () => new Set(["NVDA"]);
    const preview = await svc.previewTrades({
      email: "u@x.com",
      amount: 1000,
      isLiveTrading: false,
      isSentimentEnabled: true,
      skipHeld: true,
    });
    expect(preview.rows.find((r) => r.ticker === "NVDA")).toBeUndefined();
  });
});
