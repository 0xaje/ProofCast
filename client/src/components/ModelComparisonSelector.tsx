import * as React from "react";
import { Cpu, Sparkles, Zap, Shield, ChevronDown, Check, Scale } from "lucide-react";
import type { ModelId, MultiModelAnalysisResult } from "../../../server/eventforge/models/types";

interface ModelComparisonSelectorProps {
  analysis?: MultiModelAnalysisResult;
  selectedModelId: ModelId;
  onSelectModel: (id: ModelId) => void;
  isLoading?: boolean;
}

const MODEL_AVATARS: Record<ModelId, { label: string; color: string; bg: string; border: string }> = {
  "ensemble-oracle": { label: "Meta-Oracle", color: "#38bdf8", bg: "rgba(56,189,248,0.1)", border: "rgba(56,189,248,0.3)" },
  "deepseek-r1": { label: "DeepSeek R1", color: "#c084fc", bg: "rgba(192,132,252,0.1)", border: "rgba(192,132,252,0.3)" },
  "gemini-1.5-flash": { label: "Gemini 1.5", color: "#60a5fa", bg: "rgba(96,165,250,0.1)", border: "rgba(96,165,250,0.3)" },
  deterministic: { label: "Microstructure", color: "#d7f36b", bg: "rgba(215,243,107,0.1)", border: "rgba(215,243,107,0.3)" },
  "claude-3.5-sonnet": { label: "Claude 3.5", color: "#fb923c", bg: "rgba(251,146,60,0.1)", border: "rgba(251,146,60,0.3)" },
};

export function ModelComparisonSelector({
  analysis,
  selectedModelId,
  onSelectModel,
  isLoading,
}: ModelComparisonSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const selectedModel = analysis?.models[selectedModelId];
  const consensus = analysis?.consensus;

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d121c] p-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#38bdf8]/10 text-[#38bdf8]">
            <Cpu size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                Multi-Model EventForge
              </span>
              <span className="rounded bg-[#38bdf8]/20 px-1.5 py-0.2 font-mono text-[9px] font-bold text-[#38bdf8]">
                5 Models Active
              </span>
            </div>
            <p className="text-[11px] text-[#8b96a8]">
              Compare deterministic depth against DeepSeek, Gemini, and Meta-Oracle
            </p>
          </div>
        </div>

        {consensus && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1 text-xs">
              <Scale size={12} className="text-[#8b96a8]" />
              <span className="text-[#8b96a8]">Consensus Spread:</span>
              <span className="font-mono font-bold text-white">
                {(consensus.disagreementSpreadBps / 100).toFixed(1)}%
              </span>
              <span
                className={`ml-1 rounded px-1 text-[9px] font-bold ${
                  consensus.consensusStrength === "STRONG"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : consensus.consensusStrength === "MODERATE"
                    ? "bg-amber-500/20 text-amber-300"
                    : "bg-rose-500/20 text-rose-300"
                }`}
              >
                {consensus.consensusStrength}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Model Selection Tabs */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {(
          [
            "ensemble-oracle",
            "deepseek-r1",
            "gemini-1.5-flash",
            "deterministic",
            "claude-3.5-sonnet",
          ] as ModelId[]
        ).map((id) => {
          const isSelected = selectedModelId === id;
          const style = MODEL_AVATARS[id];
          const pred = analysis?.models[id];
          const prob = pred ? (pred.probabilityBps / 100).toFixed(1) : "—";

          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectModel(id)}
              className={`flex flex-col rounded-lg p-2.5 text-left transition-all ${
                isSelected
                  ? "border bg-white/[0.06] shadow-md"
                  : "border border-white/5 bg-white/[0.01] hover:border-white/20 hover:bg-white/[0.03]"
              }`}
              style={{
                borderColor: isSelected ? style.border : undefined,
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="font-mono text-[10px] font-bold"
                  style={{ color: style.color }}
                >
                  {style.label}
                </span>
                {isSelected && <Check size={12} style={{ color: style.color }} />}
              </div>

              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="font-mono text-base font-black text-white">
                  {isLoading ? "…" : `${prob}%`}
                </span>
                {pred && (
                  <span
                    className={`text-[9px] font-mono uppercase ${
                      pred.confidence === "HIGH"
                        ? "text-emerald-400"
                        : pred.confidence === "MEDIUM"
                        ? "text-amber-400"
                        : "text-[#8b96a8]"
                    }`}
                  >
                    {pred.confidence}
                  </span>
                )}
              </div>

              {pred && (
                <div className="mt-1 flex items-center justify-between text-[9px] text-[#8b96a8]">
                  <span>{pred.inferenceEngine === "REAL_LLM" ? "Live API" : "Analytical"}</span>
                  <span className="font-mono">{pred.latencyMs}ms</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Model Deep Dive */}
      {selectedModel && (
        <div className="mt-3 rounded-lg border border-white/5 bg-black/30 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: MODEL_AVATARS[selectedModelId].color }}
              />
              <span className="font-mono text-xs font-bold text-white">
                {selectedModel.modelName} Reasoning
              </span>
              <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-[#8b96a8]">
                {selectedModel.inferenceEngine === "REAL_LLM" ? "Live LLM Engine" : "High-Fidelity Analytical Engine"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[#8b96a8]">
              <span>Uncertainty:</span>
              <span
                className={`font-bold ${
                  selectedModel.uncertaintyLevel === "LOW"
                    ? "text-emerald-400"
                    : selectedModel.uncertaintyLevel === "MODERATE"
                    ? "text-amber-400"
                    : "text-rose-400"
                }`}
              >
                {selectedModel.uncertaintyLevel}
              </span>
            </div>
          </div>

          <div className="mt-2.5 grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
            <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-2.5">
              <div className="font-mono text-[10px] font-bold uppercase text-emerald-400">
                Bull Case
              </div>
              <p className="mt-1 text-white/80 leading-relaxed">{selectedModel.bullCase}</p>
            </div>

            <div className="rounded border border-rose-500/20 bg-rose-500/5 p-2.5">
              <div className="font-mono text-[10px] font-bold uppercase text-rose-400">
                Bear Case
              </div>
              <p className="mt-1 text-white/80 leading-relaxed">{selectedModel.bearCase}</p>
            </div>
          </div>

          <div className="mt-2 rounded border border-white/5 bg-white/[0.02] p-2.5 text-xs">
            <div className="font-mono text-[10px] font-bold uppercase text-[#38bdf8]">
              Counter-Thesis & Disagreement
            </div>
            <p className="mt-1 text-white/80 leading-relaxed">{selectedModel.counterThesis}</p>
          </div>
        </div>
      )}
    </div>
  );
}
