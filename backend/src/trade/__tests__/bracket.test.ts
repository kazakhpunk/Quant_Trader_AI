import axios from "axios";
import TradeService from "../trade-multiuser-service";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("placeOrder bracket payload", () => {
  const fakeDb = {
    collection: () => ({ findOne: async () => ({ alpacaToken: "t" }) }),
  } as any;
  const svc = new TradeService(fakeDb);
  // stub price
  (svc as any).getLatestPrice = async () => 100;

  it("builds bracket with stop and take when both pcts present", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { id: "o1", status: "new" } });
    await svc.placeOrder({
      email: "u@x.com",
      symbol: "NVDA",
      side: "buy",
      qty: 2,
      orderType: "market",
      timeInForce: "day",
      isLiveTrading: false,
      stopLossPct: 3,
      takeProfitPct: 5,
    });
    const [, payload] = mockedAxios.post.mock.calls[0] as [unknown, any, unknown];
    expect(payload).toMatchObject({
      symbol: "NVDA",
      qty: 2,
      side: "buy",
      type: "market",
      order_class: "bracket",
      stop_loss: { stop_price: 97 },
      take_profit: { limit_price: 105 },
    });
  });

  it("omits order_class when neither stop nor target given", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { id: "o2", status: "new" } });
    await svc.placeOrder({
      email: "u@x.com",
      symbol: "AAPL",
      side: "buy",
      qty: 1,
      orderType: "market",
      timeInForce: "day",
      isLiveTrading: false,
    });
    const [, payload] = mockedAxios.post.mock.calls[0] as [unknown, any, unknown];
    expect(payload.order_class).toBeUndefined();
  });
});
