/* Proofcast / Signal Room: operational error state with the same graphite, citrine, and provenance language as the primary shell. */
import { ArrowLeft, FileWarning, Radio } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#080b10] text-[#f5f6f2]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 sm:px-10">
        <header className="flex items-center gap-3 border-b border-white/[0.07] pb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#d7f36b]/25 bg-[#d7f36b]/10 text-[#d7f36b]"><FileWarning size={17} /></div>
          <div><div className="font-display text-lg font-semibold tracking-[-0.04em]">proofcast</div><div className="text-[9px] uppercase tracking-[0.22em] text-[#6f7b8f]">signal room / route status</div></div>
          <div className="ml-auto flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[#8993a4]"><span className="h-1.5 w-1.5 rounded-full bg-[#d7f36b]" /> System available</div>
        </header>
        <div className="flex flex-1 items-center py-20"><div className="max-w-2xl"><div className="mb-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#e9b65b]"><Radio size={14} /> Route unavailable <span className="text-white/20">/</span> 404</div><h1 className="font-display text-5xl font-semibold leading-[0.98] tracking-[-0.07em] sm:text-7xl">No decision record<br /><span className="text-[#7f8a9e]">exists for this path.</span></h1><p className="mt-6 max-w-lg text-sm leading-6 text-[#8993a4]">The requested route is not part of the current Proofcast workspace. Your market data and forecast records remain unaffected.</p><Link href="/" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#d7f36b] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#10140d] transition-transform hover:bg-[#e2fa80] active:scale-[0.97]"><ArrowLeft size={15} /> Return to command center</Link></div></div>
        <footer className="flex justify-between border-t border-white/[0.07] pt-6 text-[10px] uppercase tracking-[0.15em] text-[#596477]"><span>Proofcast / accountable by design</span><span>status snapshot / route not found</span></footer>
      </div>
    </main>
  );
}
