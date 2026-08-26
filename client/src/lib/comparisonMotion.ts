export type ComparisonMotionSignal = {
  value: number | null | undefined;
  sourceAsOf?: number | null;
  localRevision?: number;
  kind: "source" | "local";
};

export function shouldAnimateComparisonBar(
  previous: ComparisonMotionSignal | null,
  current: ComparisonMotionSignal,
): boolean {
  if (!previous) return false;
  if (current.kind === "source") {
    return Boolean(
      current.sourceAsOf &&
      previous.sourceAsOf &&
      current.sourceAsOf !== previous.sourceAsOf &&
      current.value !== null && current.value !== undefined &&
      current.value !== previous.value,
    );
  }

  return Boolean(
    current.localRevision !== undefined &&
    previous.localRevision !== undefined &&
    current.localRevision !== previous.localRevision &&
    current.value !== previous.value,
  );
}
