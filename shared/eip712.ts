/**
 * ProofCast EIP-712 Typed Data Specification
 * Defines standard structured commitment format for off-chain cryptographic verification.
 */

export const PROOFCAST_EIP712_DOMAIN = {
  name: "ProofCast",
  version: "1",
  chainId: 50312, // Somnia Shannon Testnet default
} as const;

export const PROOFCAST_EIP712_TYPES = {
  ForecastCommitment: [
    { name: "marketId", type: "string" },
    { name: "direction", type: "string" },
    { name: "probabilityBps", type: "uint256" },
    { name: "confidence", type: "string" },
    { name: "thesis", type: "string" },
    { name: "counterThesis", type: "string" },
    { name: "timestamp", type: "uint256" },
  ],
} as const;

export type EIP712ForecastMessage = {
  marketId: string;
  direction: "UP" | "DOWN";
  probabilityBps: bigint | number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  thesis: string;
  counterThesis: string;
  timestamp: bigint | number;
};
