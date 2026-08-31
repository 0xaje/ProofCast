import React, { createContext, useContext } from "react";
import { useAccount, useChainId, useBalance, useSwitchChain, useDisconnect, useSignTypedData } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { somniaShannonChain } from "@/lib/network";
import { PROOFCAST_EIP712_DOMAIN, PROOFCAST_EIP712_TYPES } from "../../../shared/eip712";

import { formatUnits } from "viem";

export type SignForecastParams = {
  marketId: string;
  direction: "UP" | "DOWN";
  probabilityBps: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  thesis: string;
  counterThesis: string;
  timestamp: number;
};

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
  signForecastCommitment: (params: SignForecastParams) => Promise<string | null>;
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
  signForecastCommitment: async () => null,
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

  React.useEffect(() => {
    if (address) {
      localStorage.setItem("proofcast-wallet-address", address);
    } else {
      localStorage.removeItem("proofcast-wallet-address");
    }
  }, [address]);

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

  const { signTypedDataAsync } = useSignTypedData();

  async function signForecastCommitment(params: SignForecastParams): Promise<string | null> {
    if (!address || !isConnected) return null;
    try {
      const signature = await signTypedDataAsync({
        domain: PROOFCAST_EIP712_DOMAIN,
        types: PROOFCAST_EIP712_TYPES,
        primaryType: "ForecastCommitment",
        message: {
          marketId: params.marketId,
          direction: params.direction,
          probabilityBps: BigInt(params.probabilityBps),
          confidence: params.confidence,
          thesis: params.thesis,
          counterThesis: params.counterThesis,
          timestamp: BigInt(params.timestamp),
        },
      });
      return signature;
    } catch (err) {
      console.warn("User rejected or failed EIP-712 forecast signature:", err);
      return null;
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
        signForecastCommitment,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
