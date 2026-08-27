import React, { createContext, useContext, useEffect, useState } from "react";
import {
  SOMNIA_SHANNON_TESTNET,
  connectBrowserWallet,
  getBrowserWalletAddress,
  switchOrAddSomniaShannon,
} from "@/lib/web3/somnia";

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
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const isConnected = !!address;
  const isCorrectNetwork = chainId === SOMNIA_SHANNON_TESTNET.id || chainId === 5031;

  async function fetchBalance(acc: string) {
    if (typeof window === "undefined" || !("ethereum" in window)) return;
    try {
      const rawBalance = (await (window as any).ethereum.request({
        method: "eth_getBalance",
        params: [acc, "latest"],
      })) as string;
      const formatted = (parseInt(rawBalance, 16) / 1e18).toFixed(3);
      setBalance(formatted);
    } catch {
      setBalance("0.000");
    }
  }

  async function initWallet() {
    if (typeof window === "undefined" || !("ethereum" in window)) return;
    const ethereum = (window as any).ethereum;
    try {
      const currentAddress = await getBrowserWalletAddress();
      if (currentAddress) {
        setAddress(currentAddress);
        const currentChainHex = (await ethereum.request({ method: "eth_chainId" })) as string;
        setChainId(parseInt(currentChainHex, 16));
        fetchBalance(currentAddress);
      }
    } catch (err) {
      console.warn("[Wallet] Auto-connect check:", err);
    }
  }

  useEffect(() => {
    initWallet();
    if (typeof window !== "undefined" && "ethereum" in window) {
      const ethereum = (window as any).ethereum;
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]!);
          fetchBalance(accounts[0]!);
        } else {
          setAddress(null);
          setBalance(null);
        }
      };
      const handleChainChanged = (chainHex: string) => {
        setChainId(parseInt(chainHex, 16));
        if (address) fetchBalance(address);
      };

      ethereum.on("accountsChanged", handleAccountsChanged);
      ethereum.on("chainChanged", handleChainChanged);

      return () => {
        ethereum.removeListener("accountsChanged", handleAccountsChanged);
        ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, [address]);

  async function connect() {
    setIsConnecting(true);
    try {
      const acc = await connectBrowserWallet();
      setAddress(acc);
      if (typeof window !== "undefined" && "ethereum" in window) {
        const ethereum = (window as any).ethereum;
        const currentChainHex = (await ethereum.request({ method: "eth_chainId" })) as string;
        setChainId(parseInt(currentChainHex, 16));
      }
      await fetchBalance(acc);
    } finally {
      setIsConnecting(false);
    }
  }

  function disconnect() {
    setAddress(null);
    setBalance(null);
  }

  async function switchNetwork() {
    await switchOrAddSomniaShannon();
    if (typeof window !== "undefined" && "ethereum" in window) {
      const ethereum = (window as any).ethereum;
      const currentChainHex = (await ethereum.request({ method: "eth_chainId" })) as string;
      setChainId(parseInt(currentChainHex, 16));
    }
  }

  return (
    <WalletContext.Provider
      value={{
        address,
        chainId,
        isConnected,
        isConnecting,
        isCorrectNetwork,
        balance,
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
