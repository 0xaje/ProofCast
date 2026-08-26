import { describe, expect, it } from "vitest";
import { formatRawUnits, marketStateAt } from "./dreamdex";

describe("DreamDEX snapshot safeguards", () => {
  it("derives activity from the real trading window rather than the display question", () => {
    expect(marketStateAt({ tradingStart: "200", expiry: "500" } as never, 199)).toBe("PREOPEN");
    expect(marketStateAt({ tradingStart: "200", expiry: "500" } as never, 200)).toBe("TRADING");
    expect(marketStateAt({ tradingStart: "200", expiry: "500" } as never, 500)).toBe("LOCKED");
  });

  it("formats raw outcome quantities using the market-provided decimal scale", () => {
    expect(formatRawUnits(1234500000000000000n, 18)).toBe("1.234");
    expect(formatRawUnits(1250000n, 6)).toBe("1.25");
  });
});
