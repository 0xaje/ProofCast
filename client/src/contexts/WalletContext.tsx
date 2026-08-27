import React, { createContext, useContext } from "react";
import { useAccount, useChainId, useBalance, useSwitchChain, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { somniaShannonChain } from "@/lib/network";

import { formatUnits } from "viem";

interface WalletContextType {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  isCorrectNetwork: boolean;
  balance: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  chainId: null,
  isConnected: false,
  isConnecting: false,
  isCorrectNetwork: false,
  balance: null,
  connect: async () => {},
  disconnect: () => {},
  switchNetwork: async () => {},
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected, isConnecting } = useAccount();
  const currentChainId = useChainId();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { openConnectModal } = useConnectModal();

  const { data: balanceData } = useBalance({
    address: address,
  });

  const isCorrectNetwork =
    currentChainId === somniaShannonChain.id || currentChainId === 50312 || currentChainId === 5031;

  const formattedBalance = balanceData
    ? Number(formatUnits(balanceData.value, balanceData.decimals)).toFixed(3)
    : null;

  async function connect() {
    if (openConnectModal) {
      openConnectModal();
    }
  }

  function disconnect() {
    wagmiDisconnect();
  }

  async function switchNetwork() {
    if (switchChainAsync) {
      try {
        await switchChainAsync({ chainId: somniaShannonChain.id });
      } catch (err) {
        console.error("Failed to switch network via Wagmi:", err);
      }
    }
  }

  return (
    <WalletContext.Provider
      value={{
        address: address ?? null,
        chainId: currentChainId ?? null,
        isConnected,
        isConnecting,
        isCorrectNetwork,
        balance: formattedBalance,
        connect,
        disconnect,
        switchNetwork,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
