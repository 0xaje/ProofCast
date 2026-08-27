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
                // 1. Disconnected State
                if (!connected) {
                  return (
                    <button
                      onClick={openConnectModal}
                      type="button"
                      className="group flex h-9 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-3.5 text-[11px] font-medium tracking-wide text-[#e8e6de] shadow-sm backdrop-blur-md transition-all duration-200 hover:border-[#d7f36b]/60 hover:bg-[#d7f36b]/10 hover:text-[#d7f36b] active:scale-[0.98] cursor-pointer"
                    >
                      <Wallet size={13} className="text-[#8b96a8] transition-colors group-hover:text-[#d7f36b]" />
                      <span>Connect Wallet</span>
                    </button>
                  );
                }

                // 2. Unsupported / Wrong Network State
                if (chain.unsupported) {
                  return (
                    <button
                      onClick={openChainModal}
                      type="button"
                      className="flex h-9 items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 text-[10px] font-mono font-semibold text-amber-300 transition-all hover:bg-amber-500/20 active:scale-[0.98] cursor-pointer"
                    >
                      <AlertTriangle size={13} className="animate-pulse text-amber-400" />
                      <span>Switch Network</span>
                    </button>
                  );
                }

                // 3. Connected State (Single Minimalist Account Pill)
                return (
                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="flex h-9 items-center gap-2 rounded-xl border border-white/12 bg-white/[0.05] px-3 font-mono text-[11px] font-medium text-[#f5f6f2] shadow-sm backdrop-blur-md transition-all duration-200 hover:border-[#d7f36b]/50 hover:bg-white/[0.08] hover:text-white active:scale-[0.98] cursor-pointer"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    <span>{account.displayName}</span>
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
