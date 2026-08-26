/* Proofcast / Signal Room: shared persistent rail and utility bar; evidence-led navigation across every route. */
import { Link, useLocation } from "wouter";
import { Bell, Compass, FileCheck2, GitCompareArrows, Menu, Radio, RefreshCw, Search, Settings2, WalletCards, X } from "lucide-react";
import { ReactNode, useState } from "react";
import { trpc } from "@/lib/trpc";

const navItems = [
  { href: "/signal", label: "Signal room", icon: Compass },
  { href: "/market", label: "Market decision", icon: GitCompareArrows },
  { href: "/proof", label: "Proof profile", icon: FileCheck2 },
];

export function StatusChip({ children, tone = "snapshot" }: { children: ReactNode; tone?: "live" | "snapshot" | "unavailable" | "watch" }) {
  const styles = {
    live: "border-[#d7f36b]/25 bg-[#d7f36b]/8 text-[#d7f36b]",
    snapshot: "border-[#8ba6ff]/25 bg-[#8ba6ff]/8 text-[#a5baff]",
    unavailable: "border-white/10 bg-white/[0.035] text-[#a2adbd]",
    watch: "border-[#e9b65b]/25 bg-[#e9b65b]/8 text-[#e9b65b]",
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.17em] ${styles[tone]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{children}</span>;
}

export function SectionHeading({ eyebrow, title, detail }: { eyebrow: string; title: string; detail?: string }) {
  return <div><div className="text-[10px] font-bold uppercase tracking-[0.21em] text-[#6f7b8f]">{eyebrow}</div><h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.06em] text-white sm:text-4xl">{title}</h1>{detail && <p className="mt-3 max-w-2xl text-sm leading-6 text-[#8d98aa]">{detail}</p>}</div>;
}

export function Metric({ label, value, detail, tone = "white" }: { label: string; value: string; detail: string; tone?: "white" | "citrine" | "cobalt" | "muted" }) {
  const tones = { white: "text-white", citrine: "text-[#d7f36b]", cobalt: "text-[#9db5ff]", muted: "text-[#8993a4]" };
  return <div className="min-w-0"><div className="text-[9px] font-bold uppercase tracking-[0.17em] text-[#6f7b8f]">{label}</div><div className={`mt-2 font-display text-3xl font-semibold tracking-[-0.06em] ${tones[tone]}`}>{value}</div><div className="mt-1 text-[11px] text-[#7f8a9e]">{detail}</div></div>;
}

export function ProbabilityBand({ market, model, you, compact = false }: { market: number; model?: number; you?: number; compact?: boolean }) {
  const rows = [["Market", market, "bg-white/65", "text-white"], ["EventForge", model, "bg-[#8ba6ff]", "text-[#9db5ff]"], ["You", you, "bg-[#d7f36b]", "text-[#d7f36b]"]];
  return <div className={compact ? "space-y-3" : "space-y-5"}>{rows.map(([label, value, bar, text]) => <div key={label as string}><div className="mb-2 flex items-center justify-between text-[11px]"><span className="text-[#a8b0bd]">{label as string}</span><span className={`font-mono font-semibold ${text}`}>{typeof value === "number" ? `${value}% UP` : "Not connected"}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[0.07]"><div className={`h-full rounded-full ${bar}`} style={{ width: `${typeof value === "number" ? value : 0}%` }} /></div></div>)}</div>;
}

function statusTone(state: "LIVE" | "STALE" | "UNAVAILABLE" | "ERROR" | undefined) {
  if (state === "LIVE") return "live" as const;
  if (state === "STALE") return "watch" as const;
  return "unavailable" as const;
}

function liveLabel(state: "LIVE" | "STALE" | "UNAVAILABLE" | "ERROR" | undefined) {
  if (state === "LIVE") return "Live verified data";
  if (state === "STALE") return "Stale verified data";
  if (state === "ERROR") return "Live-data query error";
  return "Live data unavailable";
}

function RailContent({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  const snapshot = trpc.dreamdex.snapshot.useQuery(undefined, { refetchInterval: 15_000, retry: 1 });
  const data = snapshot.data;
  const connectionState = snapshot.isError ? "ERROR" : data?.state;
  const connectionMessage = snapshot.isError ? "Proofcast could not reach its verified DreamDEX snapshot procedure. Market values are withheld until a successful retry." : data?.message;
  return <>
    <Link href="/" onClick={onNavigate} className="flex items-center gap-3 px-5 py-6"><img src="/manus-storage/proofcast-mark_6cbda10a.png" alt="Proofcast proof seal" className="h-9 w-9 rounded-xl border border-[#d7f36b]/25 bg-[#d7f36b]/10" /><div><div className="font-display text-[18px] font-semibold tracking-[-0.07em] text-white">proof<span className="text-[#d7f36b]">cast</span></div><div className="text-[9px] uppercase tracking-[0.22em] text-[#6f7b8f]">Proof instrument / 01</div></div></Link>
    <div className="px-4 pt-8"><div className="px-3 pb-3 text-[9px] font-bold uppercase tracking-[0.22em] text-[#697487]">Evidence workspace</div><nav className="space-y-1">{navItems.map(({ href, label, icon: Icon }) => { const active = location.startsWith(href); return <Link key={href} href={href} onClick={onNavigate} className={`flex items-center justify-between rounded-xl px-3 py-3 text-[12px] transition-all duration-200 ${active ? "bg-white/[0.08] text-white shadow-[inset_0_0_1px_rgba(255,255,255,0.03)]" : "text-[#8b96a8] hover:bg-white/[0.04] hover:text-white"}`}><span className="flex items-center gap-3"><Icon size={16} className={active ? "text-[#d7f36b]" : "text-[#687387]"} />{label}</span>{active && <span className="text-[#d7f36b]">›</span>}</Link>; })}</nav><div className="mx-3 mt-7 border-l-2 border-[#d7f36b] pl-3 text-[10px] leading-4 text-[#8993a4]">Market signal, forecast commitment, and proof receipt stay deliberately separate.</div></div>
    <div className="mt-auto p-4"><div className="rounded-2xl border border-[#d7f36b]/15 bg-[#d7f36b]/[0.035] p-4"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.17em] text-[#d7f36b]"><Radio size={13} /> Connection</div><div className="mt-3 flex items-center justify-between gap-3"><div className="text-[12px] font-medium text-white">{liveLabel(connectionState)}</div><StatusChip tone={statusTone(connectionState)}>{connectionState ?? "checking"}</StatusChip></div><div className="mt-2 text-[11px] leading-5 text-[#8993a4]">{connectionMessage ?? "Checking the verified DreamDEX Event Contract source."}</div><button onClick={() => snapshot.refetch()} disabled={snapshot.isFetching} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#d7f36b] py-2.5 text-[11px] font-bold text-[#10140d] disabled:cursor-wait disabled:opacity-55"><RefreshCw size={14} className={snapshot.isFetching ? "animate-spin" : ""} /> {snapshot.isFetching ? "Verifying source" : connectionState === "ERROR" ? "Retry verified source" : "Refresh verified data"}</button></div><div className="mt-4 flex items-center gap-3 border-t border-white/[0.07] pt-4"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#202937] text-[10px] font-bold text-[#d7f36b]">AO</div><div><div className="text-[11px] font-semibold text-white">Operator workspace</div><div className="text-[10px] text-[#677285]">Read-only mode · no wallet signer</div></div><Settings2 size={14} className="ml-auto text-[#677285]" /></div></div>
  </>;
}

export function SignalShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const snapshot = trpc.dreamdex.snapshot.useQuery(undefined, { refetchInterval: 15_000, retry: 1 });
  const connectionState = snapshot.isError ? "ERROR" : snapshot.data?.state;
  return <div className="pc-shell min-h-screen bg-[#080b10] text-[#f5f6f2] selection:bg-[#d7f36b] selection:text-[#10140d]"><div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_78%_0%,rgba(45,68,133,0.16),transparent_28%),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] [background-size:auto,72px_100%]" />
    <aside className="fixed inset-y-0 z-40 flex w-[248px] flex-col border-r border-white/[0.07] bg-[#0a0e14]/96 shadow-[18px_0_60px_rgba(0,0,0,0.22)] backdrop-blur-xl max-lg:hidden"><RailContent /></aside>
    {mobileOpen && <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm lg:hidden"><aside className="flex h-full w-[290px] flex-col border-r border-white/[0.08] bg-[#0a0e14] shadow-2xl"><div className="flex items-center justify-end px-4 pt-4"><button onClick={() => setMobileOpen(false)} className="rounded-lg border border-white/10 p-2 text-[#8b96a8]"><X size={16} /></button></div><RailContent onNavigate={() => setMobileOpen(false)} /></aside></div>}
    <div className="relative lg:ml-[248px]"><header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-white/[0.07] bg-[#080b10]/86 px-5 backdrop-blur-xl sm:px-8 lg:px-12"><div className="flex items-center gap-3"><div className="flex items-center gap-2"><img src="/manus-storage/proofcast-mark_6cbda10a.png" alt="" className="h-6 w-6 rounded-md border border-[#d7f36b]/20 bg-[#d7f36b]/10" /><span className="font-display text-[14px] font-semibold tracking-[-0.06em] text-white">proof<span className="text-[#d7f36b]">cast</span></span></div><span className="hidden h-4 w-px bg-white/10 sm:block" /><div className="hidden items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#6f7b8f] sm:flex"><span className={`h-2 w-2 rounded-full ${connectionState === "LIVE" ? "animate-pulse bg-[#d7f36b]" : "bg-[#e9b65b]"}`} /> DreamDEX mainnet / {connectionState ?? "checking"}</div></div><div className="flex items-center gap-3"><button className="hidden h-9 items-center gap-2 rounded-lg border border-white/[0.08] px-3 text-[11px] text-[#8f99aa] transition-colors hover:border-white/20 hover:text-white sm:flex"><Search size={14} /> Search markets <kbd className="ml-2 rounded border border-white/10 px-1.5 py-0.5 text-[9px]">⌘ K</kbd></button><button aria-label="Notifications" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-[#8490a3] hover:text-white"><Bell size={15} /></button><button aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-[#8490a3] lg:hidden"><Menu size={16} /></button></div></header><main className="mx-auto max-w-[1480px] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">{children}</main></div>
  </div>;
}
