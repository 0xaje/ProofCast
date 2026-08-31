import { describe, it, expect } from "vitest";
import { determineForecasterBadge } from "./scoring";
import { calculateLeadTimeWeight } from "./scoring";

describe("Forecaster Reputation Badge Calculation", () => {
  it("returns UNRANKED for users with fewer than 5 verified proofs", () => {
    const badge = determineForecasterBadge(4, 1000, 80);
    expect(badge.tier).toBe("UNRANKED");
    expect(badge.tierCode).toBe(0);
  });

  it("returns BRONZE for users with >= 5 verified proofs and Brier score <= 2500 bps", () => {
    const badge = determineForecasterBadge(5, 2200, 60);
    expect(badge.tier).toBe("BRONZE");
    expect(badge.tierCode).toBe(1);
    expect(badge.title).toBe("Bronze Forecaster");
  });

  it("returns SILVER for users with >= 15 verified proofs and Brier score <= 1800 bps", () => {
    const badge = determineForecasterBadge(15, 1500, 65);
    expect(badge.tier).toBe("SILVER");
    expect(badge.tierCode).toBe(2);
    expect(badge.title).toBe("Silver Superforecaster");
  });

  it("returns GOLD_MASTER for elite users with >= 30 verified proofs and Brier score <= 1200 bps", () => {
    const badge = determineForecasterBadge(35, 950, 75);
    expect(badge.tier).toBe("GOLD_MASTER");
    expect(badge.tierCode).toBe(3);
    expect(badge.title).toBe("Gold Master Oracle");
  });
});

describe("Forecaster Staking & Lead-Time Metrics", () => {
  it("calculates logarithmic lead-time weight bonus correctly", () => {
    const committed = new Date("2026-08-01T00:00:00Z");
    const resolved = new Date("2026-08-03T00:00:00Z"); // 48 hours lead time
    const result = calculateLeadTimeWeight(committed, resolved);

    expect(result.leadHours).toBe(48);
    expect(result.weight).toBeGreaterThan(1.0);
    expect(result.weight).toBeLessThanOrEqual(2.0);
  });
});
