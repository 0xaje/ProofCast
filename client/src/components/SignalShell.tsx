/* Proofcast / Signal Room: shared persistent rail and utility bar; evidence-led navigation across every route. */
import { Link, useLocation } from "wouter";
import { Compass, FileCheck2, GitCompareArrows, Menu, Radio, RefreshCw, Trophy, X, Cpu } from "lucide-react";
import { ReactNode, useState } from "react";
import { trpc } from "@/lib/trpc";
import { CustomConnectButton } from "@/components/CustomConnectButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useWallet } from "@/contexts/WalletContext";

const navItems = [
  { href: "/signal", label: "Signal room", icon: Compass },
  { href: "/market", label: "Market decision", icon: GitCompareArrows },
  { href: "/proof", label: "Proof profile", icon: FileCheck2 },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/arena", label: "AI Model Arena", icon: Cpu },
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
  return <div><div className="text-[10px] font-bold uppercase tracking-[0.21em] text-[#6f7b8f]">{eyebrow}</div><h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.06em] text-[var(--pc-heading,#ffffff)] sm:text-4xl">{title}</h1>{detail && <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--pc-muted,#8d98aa)]">{detail}</p>}</div>;
}

export function Metric({ label, value, detail, tone = "white" }: { label: string; value: string; detail: string; tone?: "white" | "citrine" | "cobalt" | "muted" }) {
  const tones = { white: "text-[var(--pc-heading,#ffffff)]", citrine: "text-[#d7f36b]", cobalt: "text-[#9db5ff]", muted: "text-[var(--pc-muted,#8993a4)]" };
  return <div className="min-w-0"><div className="text-[9px] font-bold uppercase tracking-[0.17em] text-[#6f7b8f]">{label}</div><div className={`mt-2 font-display text-3xl font-semibold tracking-[-0.06em] ${tones[tone]}`}>{value}</div><div className="mt-1 text-[11px] text-[#7f8a9e]">{detail}</div></div>;
}

export function ProbabilityBand({ market, model, you, compact = false }: { market: number; model?: number; you?: number; compact?: boolean }) {
  const rows = [["Market", market, "bg-white/65", "text-[var(--pc-heading,#ffffff)]"], ["EventForge", model, "bg-[#8ba6ff]", "text-[#9db5ff]"], ["You", you, "bg-[#d7f36b]", "text-[#d7f36b]"]];
  return <div className={compact ? "space-y-3" : "space-y-5"}>{rows.map(([label, value, bar, text]) => <div key={label as string}><div className="mb-2 flex items-center justify-between text-[11px]"><span className="text-[#a8b0bd]">{label as string}</span><span className={`font-mono font-semibold ${text}`}>{typeof value === "number" ? `${value}% UP` : "Not connected"}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[0.07]"><div className={`h-full rounded-full ${bar}`} style={{ width: `${typeof value === "number" ? value : 0}%` }} /></div></div>)}</div>;
}

function statusTone(state: "LIVE" | "STALE" | "UNAVAILABLE" | "ERROR" | undefined) {
  if (state === "LIVE") return "live" as const;
  if (state === "STALE") return "watch" as const;
  return "unavailable" as const;
}

function liveLabel(state: "LIVE" | "STALE" | "UNAVAILABLE" | "ERROR" | undefined) {
  if (state === "LIVE") return "Live DreamDEX indexed";
  if (state === "STALE") return "Stale DreamDEX snapshot";
  if (state === "ERROR") return "Verified connection retry required";
  return "Live data unavailable";
}

function RailContent({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  const snapshot = trpc.dreamdex.snapshot.useQuery(undefined, { refetchInterval: 15_000, retry: 1 });
  const { address, isConnected } = useWallet();
  const data = snapshot.data;
  const connectionState = snapshot.isError ? "ERROR" : data?.state;
  const connectionMessage = snapshot.isError ? "Proofcast could not reach its verified DreamDEX snapshot procedure. Market values are withheld until a successful retry." : data?.message;
  return <>
    <Link href="/" onClick={onNavigate} className="flex items-center gap-3 px-5 py-6">
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#151515] bg-[#c8f06a] text-[#151515] font-bold text-base shadow-[0_0_15px_rgba(200,240,106,0.25)] shrink-0">
        ↗
      </span>
      <div>
        <div className="font-display text-[18px] font-semibold tracking-[-0.07em] text-[var(--pc-heading,#ffffff)]">
          proof<span className="text-[#f43f5e]">cast</span>
        </div>
        <div className="text-[9px] uppercase tracking-[0.22em] text-[#6f7b8f]">Proof instrument / 01</div>
      </div>
    </Link>
    <div className="px-4 pt-8"><div className="px-3 pb-3 text-[9px] font-bold uppercase tracking-[0.22em] text-[#697487]">Evidence workspace</div><nav className="space-y-1">{navItems.map(({ href, label, icon: Icon }) => { const active = location.startsWith(href); return <Link key={href} href={href} onClick={onNavigate} className={`flex items-center justify-between rounded-xl px-3 py-3 text-[12px] transition-all duration-200 ${active ? "bg-white/[0.08] text-[var(--pc-heading,#ffffff)] shadow-[inset_0_0_1px_rgba(255,255,255,0.03)] border-l-2 border-[#d7f36b]" : "text-[var(--pc-muted,#8b96a8)] hover:bg-white/[0.04] hover:text-[var(--pc-heading,#ffffff)]"}`}><span className="flex items-center gap-3"><Icon size={16} className={active ? "text-[#d7f36b]" : "text-[#687387]"} />{label}</span>{active && <span className="text-[#d7f36b]">›</span>}</Link>; })}</nav></div>
    <div className="mt-auto p-4"><div className="rounded-2xl border border-[#d7f36b]/15 bg-[#d7f36b]/[0.035] p-4"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.17em] text-[#d7f36b]"><Radio size={13} /> Connection</div><div className="mt-3 flex items-center justify-between gap-3"><div className="text-[12px] font-medium text-[var(--pc-heading,#ffffff)]">{liveLabel(connectionState)}</div><StatusChip tone={statusTone(connectionState)}>{connectionState ?? "checking"}</StatusChip></div><div className="mt-2 text-[11px] leading-5 text-[var(--pc-muted,#8993a4)]">{connectionMessage ?? "Checking the verified DreamDEX Event Contract source."}</div><button onClick={() => snapshot.refetch()} disabled={snapshot.isFetching} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#d7f36b] py-2.5 text-[11px] font-bold text-[#10140d] disabled:cursor-wait disabled:opacity-55 cursor-pointer"><RefreshCw size={14} className={snapshot.isFetching ? "animate-spin" : ""} /> {snapshot.isFetching ? "Verifying source" : connectionState === "ERROR" ? "Retry verified source" : "Refresh verified data"}</button></div><div className="mt-4 flex items-center gap-3 border-t border-white/[0.07] pt-4"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#202937] text-[10px] font-bold text-[#d7f36b] border border-[#d7f36b]/30">{isConnected && address ? address.slice(2, 4).toUpperCase() : "PC"}</div><div><div className="text-[11px] font-semibold text-[var(--pc-heading,#ffffff)]">{isConnected ? "Web3 Wallet Connected" : "Operator workspace"}</div><div className="text-[10px] text-[#677285] font-mono">{isConnected && address ? `${address.slice(0, 8)}…` : "Non-custodial proof layer"}</div></div></div></div>
  </>;
}

export function SignalShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resolutionStatusMsg, setResolutionStatusMsg] = useState<string | null>(null);
  const snapshot = trpc.dreamdex.snapshot.useQuery(undefined, { refetchInterval: 15_000, retry: 1 });
  const utils = trpc.useUtils();

  const autoResolveMutation = trpc.receipts.triggerAutoResolution.useMutation({
    onSuccess: async (result) => {
      await utils.receipts.listMine.invalidate();
      await utils.receipts.completedProofs.invalidate();
      await utils.receipts.metrics.invalidate();
      await utils.receipts.leaderboard.invalidate();
      const msg = result.resolvedCount > 0
        ? `Resolved ${result.resolvedCount} on-chain receipt(s)`
        : `Checked ${result.checkedCount} open receipt(s) — none settled yet`;
      setResolutionStatusMsg(msg);
      setTimeout(() => setResolutionStatusMsg(null), 4000);
    },
    onError: (err) => {
      setResolutionStatusMsg(`Resolution check error: ${err.message}`);
      setTimeout(() => setResolutionStatusMsg(null), 4000);
    },
  });

  const connectionState = snapshot.isError ? "ERROR" : snapshot.data?.state;

  return (
    <div className="pc-shell min-h-screen selection:bg-[#d7f36b] selection:text-[#10140d]">
      <div className="pointer-events-none fixed inset-0 pc-shell-glow" />
      <aside className="fixed inset-y-0 z-40 flex w-[248px] flex-col border-r border-[var(--pc-border,rgba(255,255,255,0.07))] bg-[var(--pc-aside-bg,#0a0e14)] shadow-[18px_0_60px_rgba(0,0,0,0.22)] backdrop-blur-xl max-lg:hidden">
        <RailContent />
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm lg:hidden">
          <aside className="flex h-full w-[290px] flex-col border-r border-[var(--pc-border,rgba(255,255,255,0.08))] bg-[var(--pc-aside-bg,#0a0e14)] shadow-2xl">
            <div className="flex items-center justify-end px-4 pt-4">
              <button onClick={() => setMobileOpen(false)} className="rounded-lg border border-white/10 p-2 text-[#8b96a8]">
                <X size={16} />
              </button>
            </div>
            <RailContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
      <div className="relative lg:ml-[248px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-[var(--pc-border,rgba(255,255,255,0.07))] bg-[var(--pc-header-bg,rgba(8,11,16,0.86))] px-5 backdrop-blur-xl sm:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#151515] bg-[#c8f06a] text-[#151515] font-bold text-xs shadow-sm shrink-0">
                ↗
              </span>
              <span className="font-display text-[14px] font-semibold tracking-[-0.06em] text-[var(--pc-heading,#ffffff)]">
                proof<span className="text-[#f43f5e]">cast</span>
              </span>
            </Link>
            <span className="hidden h-4 w-px bg-white/10 sm:block" />
            <div className="hidden items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#6f7b8f] sm:flex">
              <span className={`h-2 w-2 rounded-full ${connectionState === "LIVE" ? "animate-pulse bg-[#d7f36b]" : "bg-[#e9b65b]"}`} /> DreamDEX mainnet / {connectionState ?? "checking"}
            </div>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <ThemeToggle />
            <CustomConnectButton />
            <button aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--pc-border,rgba(255,255,255,0.08))] text-[#8490a3] hover:text-[var(--pc-heading,#ffffff)] transition cursor-pointer lg:hidden">
              <Menu size={16} />
            </button>
          </div>
        </header>

        {/* Global Toast for Resolution Trigger */}
        {resolutionStatusMsg && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-[#c8f06a]/40 bg-[#12161f] px-4 py-3 text-xs font-bold text-white shadow-2xl animate-in slide-in-from-bottom-5">
            <span className="h-2 w-2 rounded-full bg-[#c8f06a] animate-pulse" />
            {resolutionStatusMsg}
          </div>
        )}

        <main className="mx-auto max-w-[1480px] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">{children}</main>
      </div>
    </div>
  );
}
