import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Wallet, AlertTriangle } from "lucide-react";

interface CustomConnectButtonProps {
  className?: string;
}

export function CustomConnectButton({ className = "" }: CustomConnectButtonProps) {
  return (
    <div className={`relative flex items-center shrink-0 ${className}`}>
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          authenticationStatus,
          mounted,
        }) => {
          const ready = mounted && authenticationStatus !== "loading";
          const connected =
            ready &&
            account &&
            chain &&
            (!authenticationStatus || authenticationStatus === "authenticated");

          return (
            <div
              {...(!ready && {
                "aria-hidden": true,
                style: {
                  opacity: 0,
                  pointerEvents: "none",
                  userSelect: "none",
                },
              })}
            >
              {(() => {
                // 1. Disconnected State (High-Contrast, Eye-Catching Cyber-Lime CTA)
                if (!connected) {
                  return (
                    <button
                      onClick={openConnectModal}
                      type="button"
                      className="group relative flex h-10 items-center gap-2 rounded-xl border border-[#d7f36b] bg-gradient-to-r from-[#d7f36b] to-[#bfe845] px-4 text-xs font-bold uppercase tracking-wider text-[#080b10] shadow-[0_0_20px_rgba(215,243,107,0.35)] transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(215,243,107,0.55)] active:scale-[0.98] cursor-pointer"
                    >
                      <Wallet size={15} className="text-[#080b10] transition-transform group-hover:-rotate-12" />
                      <span className="font-extrabold">Connect Wallet</span>
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#080b10] opacity-40" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#080b10]" />
                      </span>
                    </button>
                  );
                }

                // 2. Unsupported / Wrong Network State (High-Visibility Amber Alert)
                if (chain.unsupported) {
                  return (
                    <button
                      onClick={openChainModal}
                      type="button"
                      className="flex h-10 items-center gap-2 rounded-xl border-2 border-amber-400 bg-amber-500/20 px-3.5 text-xs font-mono font-bold text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.3)] transition-all hover:bg-amber-500/30 active:scale-[0.98] cursor-pointer"
                    >
                      <AlertTriangle size={15} className="animate-bounce text-amber-400" />
                      <span>Switch to Somnia</span>
                    </button>
                  );
                }

                // 3. Connected State (Distinct Web3 Terminal Status Badge)
                return (
                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="group flex h-10 items-center gap-2.5 rounded-xl border border-emerald-400/50 bg-[#0c1a16] px-3.5 font-mono text-xs font-bold text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.2)] backdrop-blur-md transition-all duration-200 hover:border-emerald-400 hover:bg-[#112720] hover:text-emerald-200 active:scale-[0.98] cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400 font-sans uppercase tracking-wider">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                      </span>
                      Somnia
                    </span>
                    <span className="text-white">{account.displayName}</span>
                  </button>
                );
              })()}
            </div>
          );
        }}
      </ConnectButton.Custom>
    </div>
  );
}
