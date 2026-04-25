import { computeComposite } from "../ratings-service";

describe("computeComposite", () => {
  it("equal-weights five 0-100 scores", () => {
    expect(
      computeComposite({
        technical: 90,
        fundamental: 80,
        sentiment: 70,
        price: 60,
        volatility: 50,
      })
    ).toBe(70);
  });

  it("clamps inputs to [0,100]", () => {
    expect(
      computeComposite({
        technical: 200,
        fundamental: -10,
        sentiment: 50,
        price: 50,
        volatility: 50,
      })
    ).toBe(50); // clamped: (100 + 0 + 50 + 50 + 50) / 5
  });

  it("rounds to nearest integer", () => {
    expect(
      computeComposite({
        technical: 81,
        fundamental: 81,
        sentiment: 81,
        price: 81,
        volatility: 80,
      })
    ).toBe(81); // 80.8 → 81
  });
});
