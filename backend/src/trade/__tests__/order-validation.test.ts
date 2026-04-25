import { validateOrderRequest } from "../trade-types";

describe("validateOrderRequest", () => {
  const base = {
    email: "u@x.com",
    symbol: "NVDA",
    side: "buy" as const,
    orderType: "market" as const,
    timeInForce: "day" as const,
    isLiveTrading: false,
  };

  it("requires exactly one of qty or notional", () => {
    expect(validateOrderRequest({ ...base })).toMatch(/exactly one/);
    expect(validateOrderRequest({ ...base, qty: 1, notional: 100 })).toMatch(/exactly one/);
    expect(validateOrderRequest({ ...base, qty: 1 })).toBeNull();
    expect(validateOrderRequest({ ...base, notional: 100 })).toBeNull();
  });

  it("limit needs limitPrice", () => {
    expect(
      validateOrderRequest({ ...base, qty: 1, orderType: "limit" })
    ).toMatch(/limitPrice required/);
    expect(
      validateOrderRequest({ ...base, qty: 1, orderType: "limit", limitPrice: 100 })
    ).toBeNull();
  });

  it("rejects negative stop/target", () => {
    expect(
      validateOrderRequest({ ...base, qty: 1, stopLossPct: -1 })
    ).toMatch(/stopLossPct/);
  });
});
