import { describe, expect, it } from "vitest";
import { clearDreamDexCacheForTesting, formatRawUnits, getDreamDexSnapshot, marketStateAt } from "./dreamdex";

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

  it("serves cached snapshots within TTL and permits cache clearance", async () => {
    const prevEnv = process.env.PROOFCAST_E2E_FIXTURE;
    process.env.PROOFCAST_E2E = "1";
    process.env.PROOFCAST_E2E_FIXTURE = "1";
    try {
      const snap1 = await getDreamDexSnapshot(1);
      expect(snap1.state).toBe("LIVE");
      expect(snap1.markets.length).toBe(1);

      const snap2 = await getDreamDexSnapshot(1);
      expect(snap2.asOf).toBe(snap1.asOf);
    } finally {
      if (prevEnv) process.env.PROOFCAST_E2E_FIXTURE = prevEnv;
      else delete process.env.PROOFCAST_E2E_FIXTURE;
      delete process.env.PROOFCAST_E2E;
      clearDreamDexCacheForTesting();
    }
  });
});
