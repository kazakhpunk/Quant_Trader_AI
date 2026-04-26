import {
  computeComposite,
  normalizeRsi, normalizePe, normalizeSentimentRaw,
  normalizeRsiLong, normalizeRsiShort,
  normalizePeLong, normalizePeShort,
  normalizeSentimentLong, normalizeSentimentShort,
  normalizePriceLong, normalizePriceShort,
  normalizeVolLong, normalizeVolShort,
} from "../ratings-service";

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

describe("directional normalizers", () => {
  it("RSI: low favors longs, high favors shorts", () => {
    expect(normalizeRsiLong(20)).toBe(80);   // oversold = good long
    expect(normalizeRsiLong(80)).toBe(20);   // overbought = bad long
    expect(normalizeRsiShort(80)).toBe(80);  // overbought = good short
    expect(normalizeRsiShort(20)).toBe(20);  // oversold = bad short
  });

  it("P/E: cheap favors longs, expensive (or losses) favor shorts", () => {
    expect(normalizePeLong(10)).toBe(100);    // cheap = best long
    expect(normalizePeLong(15)).toBe(100);    // fair = best long
    expect(normalizePeLong(40)).toBeLessThan(60);
    expect(normalizePeLong(-5)).toBe(0);      // losses = worst long

    expect(normalizePeShort(-5)).toBe(100);   // losses = best short
    expect(normalizePeShort(10)).toBe(0);     // cheap = bad short
    expect(normalizePeShort(40)).toBeGreaterThan(40);
  });

  it("sentiment: positive favors longs, negative favors shorts", () => {
    expect(normalizeSentimentLong(5)).toBe(75);
    expect(normalizeSentimentLong(-5)).toBe(25);
    expect(normalizeSentimentShort(5)).toBe(25);
    expect(normalizeSentimentShort(-5)).toBe(75);
  });

  it("price: uptrend favors longs, downtrend favors shorts", () => {
    expect(normalizePriceLong(10)).toBe(75);
    expect(normalizePriceLong(-10)).toBe(25);
    expect(normalizePriceShort(10)).toBe(25);
    expect(normalizePriceShort(-10)).toBe(75);
  });

  it("volatility: low vol favored by both; shorts penalize high vol harder", () => {
    expect(normalizeVolLong(20)).toBe(75);
    expect(normalizeVolShort(20)).toBe(70);  // -1.5 vs -1.25 slope
    expect(normalizeVolLong(80)).toBe(0);
    expect(normalizeVolShort(80)).toBe(0);
  });

  it("non-finite inputs default to 50, not NaN", () => {
    expect(normalizeRsiLong(NaN)).toBe(50);
    expect(normalizeSentimentShort(Infinity)).toBe(50);
  });
});
