import { describe, expect, it } from "vitest";
import { shouldAnimateComparisonBar } from "../client/src/lib/comparisonMotion";

describe("source-aware comparison motion", () => {
  it("does not animate the initial source snapshot or an unchanged sourced value", () => {
    expect(shouldAnimateComparisonBar(null, { kind: "source", sourceAsOf: 100, value: 45 })).toBe(false);
    expect(shouldAnimateComparisonBar(
      { kind: "source", sourceAsOf: 100, value: 45 },
      { kind: "source", sourceAsOf: 200, value: 45 },
    )).toBe(false);
  });

  it("animates a changed value from a newer verified snapshot", () => {
    expect(shouldAnimateComparisonBar(
      { kind: "source", sourceAsOf: 100, value: 45 },
      { kind: "source", sourceAsOf: 200, value: 48 },
    )).toBe(true);
  });

  it("animates a local forecast only when a deliberate revision changes its value", () => {
    expect(shouldAnimateComparisonBar(
      { kind: "local", localRevision: 0, value: 50 },
      { kind: "local", localRevision: 1, value: 56 },
    )).toBe(true);
    expect(shouldAnimateComparisonBar(
      { kind: "local", localRevision: 0, value: 50 },
      { kind: "local", localRevision: 1, value: 50 },
    )).toBe(false);
  });
});
