import { computeComposite, normalizeRsi, normalizePe, normalizeSentimentRaw } from "../ratings-service";

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

describe("normalizers", () => {
  it("RSI 50 → 100 (best), 0 or 100 → 0 (worst, overbought/oversold)", () => {
    expect(normalizeRsi(50)).toBe(100);
    expect(normalizeRsi(0)).toBe(0);
    expect(normalizeRsi(100)).toBe(0);
    expect(normalizeRsi(75)).toBe(50);
  });

  it("P/E: 15 maps to 100; >50 maps near 0; <0 (loss) → 0", () => {
    expect(normalizePe(15)).toBe(100);
    expect(normalizePe(60)).toBeLessThan(20);
    expect(normalizePe(-5)).toBe(0);
  });

  // The `sentiment` npm package returns integer per-article scores, averaged.
  // Empirically these cluster in roughly [-10, 10]; map that range to [0, 100]
  // with 0 (neutral) at 50.
  it("sentiment raw ~[-10, 10] → [0, 100], 0 → 50", () => {
    expect(normalizeSentimentRaw(-10)).toBe(0);
    expect(normalizeSentimentRaw(0)).toBe(50);
    expect(normalizeSentimentRaw(10)).toBe(100);
    expect(normalizeSentimentRaw(-20)).toBe(0); // clamped
    expect(normalizeSentimentRaw(20)).toBe(100); // clamped
  });
});
