import * as React from "react";
import { Trophy, TrendingUp, ShieldCheck, Zap, Target, Activity } from "lucide-react";
import type { ModelArenaRanking } from "../../../server/eventforge/models/types";

interface ModelArenaCardProps {
  ranking: ModelArenaRanking;
  isTop?: boolean;
}

export function ModelArenaCard({ ranking, isTop }: ModelArenaCardProps) {
  const brierScoreFormatted = (ranking.meanBrierScoreBps / 10000).toFixed(4);

  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-5 transition-all ${
        isTop
          ? "border-[#38bdf8]/40 bg-gradient-to-b from-[#38bdf8]/10 via-[#0d121c] to-[#080b10] shadow-[0_0_25px_rgba(56,189,248,0.15)]"
          : "border-white/10 bg-[#0d121c] hover:border-white/20"
      }`}
    >
      {isTop && (
        <div className="absolute top-0 right-0 rounded-bl-xl bg-[#38bdf8] px-3 py-1 font-mono text-[10px] font-black uppercase text-black">
          Rank #1 Leader
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl font-mono text-base font-black shadow-inner"
            style={{
              backgroundColor: `${ranking.badgeColor}20`,
              color: ranking.badgeColor,
              border: `1px solid ${ranking.badgeColor}40`,
            }}
          >
            {ranking.avatarText}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-base font-bold text-white">{ranking.modelName}</h3>
              <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-[10px] text-[#8b96a8]">
                #{ranking.rank}
              </span>
            </div>
            <p className="text-xs text-[#8b96a8]">
              {ranking.provider} · <span className="font-mono">{ranking.family}</span>
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="font-mono text-lg font-black text-white">{brierScoreFormatted}</div>
          <div className="text-[10px] uppercase tracking-wider text-[#8b96a8]">Mean Brier Score</div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="mt-4 grid grid-cols-3 gap-2 border-y border-white/5 py-3 text-center">
        <div>
          <div className="font-mono text-sm font-bold text-emerald-400">
            {ranking.directionalAccuracyPct}%
          </div>
          <div className="text-[10px] text-[#8b96a8]">Directional Acc.</div>
        </div>
        <div>
          <div className="font-mono text-sm font-bold text-[#38bdf8]">
            +{ranking.edgeOverMarketBps} bps
          </div>
          <div className="text-[10px] text-[#8b96a8]">Edge vs Market</div>
        </div>
        <div>
          <div className="font-mono text-sm font-bold text-white">
            {ranking.totalPredictions}
          </div>
          <div className="text-[10px] text-[#8b96a8]">Resolved Proofs</div>
        </div>
      </div>

      {/* Recent Form & Status */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[#8b96a8]">Recent Form:</span>
          <div className="flex gap-1">
            {ranking.recentForm.map((result, idx) => (
              <span
                key={idx}
                className={`flex h-4 w-4 items-center justify-center rounded text-[9px] font-mono font-bold ${
                  result === "WIN"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-rose-500/20 text-rose-300"
                }`}
              >
                {result === "WIN" ? "W" : "L"}
              </span>
            ))}
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
            ranking.calibrationStatus === "HIGHLY_CALIBRATED"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
              : ranking.calibrationStatus === "MODERATE"
              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
              : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
          }`}
        >
          <Zap size={10} />
          {ranking.calibrationStatus.replace("_", " ")}
        </span>
      </div>
    </div>
  );
}
