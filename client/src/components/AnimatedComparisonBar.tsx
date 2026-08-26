import { useEffect, useRef, useState } from "react";
import { type ComparisonMotionSignal, shouldAnimateComparisonBar } from "@/lib/comparisonMotion";

type AnimatedComparisonBarProps = {
  value: number | null | undefined;
  kind: "source" | "local";
  sourceAsOf?: number | null;
  localRevision?: number;
};

export function AnimatedComparisonBar({ value, kind, sourceAsOf, localRevision }: AnimatedComparisonBarProps) {
  const signal: ComparisonMotionSignal = { value, kind, sourceAsOf, localRevision };
  const previous = useRef<ComparisonMotionSignal | null>(null);
  const [displayValue, setDisplayValue] = useState(value ?? 0);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const shouldAnimate = shouldAnimateComparisonBar(previous.current, signal);
    previous.current = signal;

    if (!shouldAnimate) {
      setAnimate(false);
      setDisplayValue(value ?? 0);
      return;
    }

    setAnimate(false);
    const frame = window.requestAnimationFrame(() => {
      setAnimate(true);
      setDisplayValue(value ?? 0);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [kind, localRevision, sourceAsOf, value]);

  return <i className={animate ? "pi-bar-motion" : undefined} style={{ width: `${displayValue}%` }} />;
}
