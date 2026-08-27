import { ConnectButton } from "@rainbow-me/rainbowkit";
import { WalletCards, AlertTriangle, CheckCircle2 } from "lucide-react";

interface CustomConnectButtonProps {
  className?: string;
  compact?: boolean;
}

export function CustomConnectButton({ className = "", compact = false }: CustomConnectButtonProps) {
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
                // 1. Not connected state
                if (!connected) {
                  return (
                    <button
                      onClick={openConnectModal}
                      type="button"
                      className="flex h-9 items-center gap-2 rounded-xl border border-[#d7f36b]/40 bg-[#d7f36b]/10 px-3.5 text-[11px] font-bold text-[#d7f36b] shadow-[0_0_15px_rgba(215,243,107,0.12)] transition-all hover:bg-[#d7f36b]/20 hover:border-[#d7f36b] active:scale-95 cursor-pointer font-mono"
                    >
                      <WalletCards size={14} />
                      <span>{compact ? "CONNECT" : "CONNECT WALLET"}</span>
                    </button>
                  );
                }

                // 2. Unsupported / Wrong Network state
                if (chain.unsupported) {
                  return (
                    <button
                      onClick={openChainModal}
                      type="button"
                      className="flex h-9 items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-600/20 px-3 text-[10px] font-bold text-red-300 font-mono transition-all cursor-pointer hover:bg-red-600/30"
                    >
                      <AlertTriangle size={13} className="animate-pulse" />
                      <span>Wrong Network</span>
                    </button>
                  );
                }

                // 3. Connected state
                return (
                  <div className="flex items-center gap-2">
                    {/* Chain indicator */}
                    <button
                      onClick={openChainModal}
                      type="button"
                      className="hidden sm:flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 text-[10px] font-mono font-medium text-[#a2adbd] hover:border-white/20 hover:bg-white/10 transition-all cursor-pointer"
                    >
                      {chain.hasIcon && (
                        <div
                          style={{
                            background: chain.iconBackground,
                            width: 12,
                            height: 12,
                            borderRadius: 999,
                            overflow: "hidden",
                            marginRight: 2,
                          }}
                        >
                          {chain.iconUrl && (
                            <img
                              alt={chain.name ?? "Chain icon"}
                              src={chain.iconUrl}
                              style={{ width: 12, height: 12 }}
                            />
                          )}
                        </div>
                      )}
                      <span>{chain.name}</span>
                    </button>

                    {/* Account button */}
                    <button
                      onClick={openAccountModal}
                      type="button"
                      className="flex h-9 items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 font-mono text-[11px] text-emerald-300 transition-all cursor-pointer hover:bg-emerald-500/20 hover:border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.1)]"
                    >
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{account.displayName}</span>
                      {account.displayBalance && !compact && (
                        <span className="text-[10px] text-emerald-400/80 pl-1 border-l border-emerald-500/30">
                          {account.displayBalance}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })()}
            </div>
          );
        }}
      </ConnectButton.Custom>
    </div>
  );
}
