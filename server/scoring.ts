import type { Forecast, ForecastRevision, ReceiptResolution } from "../drizzle/schema";

export const CALIBRATION_MINIMUM_SAMPLE = 5;

export type ForecastAtResolution = Pick<Forecast, "direction" | "probabilityBps">;

export function selectForecastAtResolution(original: Forecast & { committedAt: Date }, revisions: Array<Pick<ForecastRevision, "direction" | "probabilityBps" | "createdAt">>, verifiedAt: Date): ForecastAtResolution {
  const candidates: Array<ForecastAtResolution & { committedAt: Date }> = [
    { direction: original.direction, probabilityBps: original.probabilityBps, committedAt: original.committedAt },
    ...revisions.map(revision => ({ direction: revision.direction, probabilityBps: revision.probabilityBps, committedAt: revision.createdAt })),
  ];
  const eligible = candidates.filter(candidate => candidate.committedAt.getTime() <= verifiedAt.getTime()).sort((left, right) => right.committedAt.getTime() - left.committedAt.getTime());
  const selected = eligible[0] ?? candidates.sort((left, right) => left.committedAt.getTime() - right.committedAt.getTime())[0];
  return { direction: selected.direction, probabilityBps: selected.probabilityBps };
}

export type ScoredReceipt = {
  receiptId: number;
  probabilityBps: number;
  outcome: "YES" | "NO";
  brierScoreBps: number;
  directionalCorrect: boolean;
  resolvedAt?: Date;
};

export type CalibrationTrendPoint = {
  date: string;
  verifiedCount: number;
  directionalAccuracyPct: number;
  meanBrierScoreBps: number;
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
  calibrationStatus: "READY" | "INSUFFICIENT_SAMPLE";
  minimumSampleSize: number;
  trend: CalibrationTrendPoint[];
  bins: CalibrationBin[];
};

export function scoreVerifiedOutcome(receiptId: number, forecast: Pick<Forecast, "probabilityBps" | "direction">, resolution: Pick<ReceiptResolution, "outcome" | "verificationStatus">): ScoredReceipt | null {
  if (resolution.verificationStatus !== "VERIFIED" || resolution.outcome === "VOID") return null;
  const outcomeBps = resolution.outcome === "YES" ? 10_000 : 0;
  const delta = forecast.probabilityBps - outcomeBps;
  return {
    receiptId,
    probabilityBps: forecast.probabilityBps,
    outcome: resolution.outcome,
    brierScoreBps: Math.round((delta * delta) / 10_000),
    directionalCorrect: (forecast.direction === "UP") === (resolution.outcome === "YES"),
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

  const chronological = [...scored].sort((left, right) => (left.resolvedAt?.getTime() ?? 0) - (right.resolvedAt?.getTime() ?? 0));
  const trend: CalibrationTrendPoint[] = [];
  chronological.forEach((item, index) => {
    const sample = chronological.slice(0, index + 1);
    trend.push({
      date: (item.resolvedAt ?? new Date()).toISOString(),
      verifiedCount: sample.length,
      directionalAccuracyPct: Math.round((sample.filter(entry => entry.directionalCorrect).length / sample.length) * 10_000) / 100,
      meanBrierScoreBps: Math.round(sample.reduce((sum, entry) => sum + entry.brierScoreBps, 0) / sample.length),
    });
  });

  return {
    verifiedCount: scored.length,
    excludedCount,
    directionalAccuracyPct: scored.length ? Math.round((scored.filter(item => item.directionalCorrect).length / scored.length) * 10_000) / 100 : null,
    meanBrierScoreBps: scored.length ? Math.round(scored.reduce((sum, item) => sum + item.brierScoreBps, 0) / scored.length) : null,
    calibrationStatus: scored.length >= CALIBRATION_MINIMUM_SAMPLE ? "READY" : "INSUFFICIENT_SAMPLE",
    minimumSampleSize: CALIBRATION_MINIMUM_SAMPLE,
    trend,
    bins: bins.map(bin => ({
      ...bin,
      predictedBps: bin.count ? Math.round(bin.predictedBps / bin.count) : 0,
      observedBps: bin.count ? Math.round(bin.observedBps / bin.count) : 0,
    })),
  };
}
