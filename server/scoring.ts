import type { Forecast, ForecastRevision, ReceiptResolution } from "../drizzle/schema";

export const CALIBRATION_MINIMUM_SAMPLE = 5;

export type ForecastAtResolution = Pick<Forecast, "direction" | "probabilityBps">;

export function selectForecastAtResolution(
  original: Forecast & { committedAt: Date },
  revisions: Array<Pick<ForecastRevision, "direction" | "probabilityBps" | "createdAt">>,
  verifiedAt: Date
): ForecastAtResolution {
  const candidates: Array<ForecastAtResolution & { committedAt: Date }> = [
    { direction: original.direction, probabilityBps: original.probabilityBps, committedAt: original.committedAt },
    ...revisions.map((revision) => ({
      direction: revision.direction,
      probabilityBps: revision.probabilityBps,
      committedAt: revision.createdAt,
    })),
  ];
  const eligible = candidates
    .filter((candidate) => candidate.committedAt.getTime() <= verifiedAt.getTime())
    .sort((left, right) => right.committedAt.getTime() - left.committedAt.getTime());
  const selected = eligible[0] ?? candidates.sort((left, right) => left.committedAt.getTime() - right.committedAt.getTime())[0];
  return { direction: selected.direction, probabilityBps: selected.probabilityBps };
}

export type ScoredReceipt = {
  receiptId: number;
  probabilityBps: number;
  outcome: "YES" | "NO";
  brierScoreBps: number;
  timeWeightedBrierBps?: number;
  leadTimeHours?: number;
  directionalCorrect: boolean;
  resolvedAt?: Date;
  committedAt?: Date;
};

export type CalibrationTrendPoint = {
  date: string;
  verifiedCount: number;
  directionalAccuracyPct: number;
  meanBrierScoreBps: number;
  meanTimeWeightedBrierBps?: number;
};

export type CalibrationBin = {
  lowerBps: number;
  upperBps: number;
  count: number;
  predictedBps: number;
  observedBps: number;
};

export type CalibrationMetrics = {
  verifiedCount: number;
  excludedCount: number;
  directionalAccuracyPct: number | null;
  meanBrierScoreBps: number | null;
  meanTimeWeightedBrierBps?: number | null;
  earlyPredictionBonusPct?: number | null;
  calibrationStatus: "READY" | "INSUFFICIENT_SAMPLE";
  minimumSampleSize: number;
  trend: CalibrationTrendPoint[];
  bins: CalibrationBin[];
};

/**
 * Calculates lead time weight:
 * Predictions made far in advance receive a higher skill weight w >= 1.0.
 */
export function calculateLeadTimeWeight(committedAt?: Date, resolvedAt?: Date): { weight: number; leadHours: number } {
  if (!committedAt || !resolvedAt) return { weight: 1.0, leadHours: 0 };
  const diffMs = Math.max(0, resolvedAt.getTime() - committedAt.getTime());
  const leadHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
  // Weight scales from 1.0 up to 2.0 based on lead time (days)
  const weight = 1.0 + Math.min(1.0, Math.log1p(leadHours / 24));
  return { weight: Math.round(weight * 100) / 100, leadHours };
}

export function scoreVerifiedOutcome(
  receiptId: number,
  forecast: Pick<Forecast, "probabilityBps" | "direction"> & { committedAt?: Date },
  resolution: Pick<ReceiptResolution, "outcome" | "verificationStatus"> & { resolvedAt?: Date }
): ScoredReceipt | null {
  if (resolution.verificationStatus !== "VERIFIED" || resolution.outcome === "VOID") return null;
  const outcomeBps = resolution.outcome === "YES" ? 10_000 : 0;
  const delta = forecast.probabilityBps - outcomeBps;
  const brierScoreBps = Math.round((delta * delta) / 10_000);

  const { weight, leadHours } = calculateLeadTimeWeight(forecast.committedAt, resolution.resolvedAt);
  // Time-weighted Brier: If prediction was accurate (low brier score), early prediction boosts the score bonus
  const timeWeightedBrierBps = Math.round(brierScoreBps / weight);

  return {
    receiptId,
    probabilityBps: forecast.probabilityBps,
    outcome: resolution.outcome,
    brierScoreBps,
    timeWeightedBrierBps,
    leadTimeHours: leadHours,
    directionalCorrect: (forecast.direction === "UP") === (resolution.outcome === "YES"),
    resolvedAt: resolution.resolvedAt,
    committedAt: forecast.committedAt,
  };
}

export function calculateCalibrationMetrics(scored: ScoredReceipt[], excludedCount = 0): CalibrationMetrics {
  const bins: CalibrationBin[] = Array.from({ length: 5 }, (_, index) => ({
    lowerBps: index * 2_000,
    upperBps: (index + 1) * 2_000,
    count: 0,
    predictedBps: 0,
    observedBps: 0,
  }));

  for (const item of scored) {
    const index = Math.min(Math.floor(item.probabilityBps / 2_000), bins.length - 1);
    const bin = bins[index];
    bin.count += 1;
    bin.predictedBps += item.probabilityBps;
    bin.observedBps += item.outcome === "YES" ? 10_000 : 0;
  }

  const chronological = [...scored].sort(
    (left, right) => (left.resolvedAt?.getTime() ?? 0) - (right.resolvedAt?.getTime() ?? 0)
  );
  const trend: CalibrationTrendPoint[] = [];
  chronological.forEach((item, index) => {
    const sample = chronological.slice(0, index + 1);
    trend.push({
      date: (item.resolvedAt ?? new Date()).toISOString(),
      verifiedCount: sample.length,
      directionalAccuracyPct:
        Math.round((sample.filter((entry) => entry.directionalCorrect).length / sample.length) * 10_000) / 100,
      meanBrierScoreBps: Math.round(sample.reduce((sum, entry) => sum + entry.brierScoreBps, 0) / sample.length),
      meanTimeWeightedBrierBps: Math.round(
        sample.reduce((sum, entry) => sum + (entry.timeWeightedBrierBps ?? entry.brierScoreBps), 0) / sample.length
      ),
    });
  });

  const meanBrier = scored.length
    ? Math.round(scored.reduce((sum, item) => sum + item.brierScoreBps, 0) / scored.length)
    : null;
  const meanTimeWeighted = scored.length
    ? Math.round(
        scored.reduce((sum, item) => sum + (item.timeWeightedBrierBps ?? item.brierScoreBps), 0) / scored.length
      )
    : null;

  return {
    verifiedCount: scored.length,
    excludedCount,
    directionalAccuracyPct: scored.length
      ? Math.round((scored.filter((item) => item.directionalCorrect).length / scored.length) * 10_000) / 100
      : null,
    meanBrierScoreBps: meanBrier,
    meanTimeWeightedBrierBps: meanTimeWeighted,
    earlyPredictionBonusPct:
      meanBrier !== null && meanTimeWeighted !== null && meanBrier > 0
        ? Math.max(0, Math.round(((meanBrier - meanTimeWeighted) / meanBrier) * 10_000) / 100)
        : 0,
    calibrationStatus: scored.length >= CALIBRATION_MINIMUM_SAMPLE ? "READY" : "INSUFFICIENT_SAMPLE",
    minimumSampleSize: CALIBRATION_MINIMUM_SAMPLE,
    trend,
    bins: bins.map((bin) => ({
      ...bin,
      predictedBps: bin.count ? Math.round(bin.predictedBps / bin.count) : 0,
      observedBps: bin.count ? Math.round(bin.observedBps / bin.count) : 0,
    })),
  };
}
