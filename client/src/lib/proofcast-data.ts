/* Proofcast / Signal Room: static demo snapshots are visibly non-live and never represent a real execution state. */
export type MarketQuality = "TRADEABLE" | "WATCH" | "NO TRADE";

export type MarketSnapshot = {
  marketId: string;
  symbol: "BTC" | "ETH";
  name: string;
  question: string;
  marketProbability: number;
  modelEstimate: number;
  timeRemaining: string;
  quality: MarketQuality;
  spread: string;
  depth: string;
  resolution: string;
};

export const marketSnapshots: MarketSnapshot[] = [
  { marketId: "DD-BTC-68500-01", symbol: "BTC", name: "Bitcoin", question: "BTC above $68,500 at window close", marketProbability: 64, modelEstimate: 71, timeRemaining: "08:42", quality: "TRADEABLE", spread: "2.1%", depth: "Adequate", resolution: "Reference price at expiry" },
  { marketId: "DD-ETH-3540-02", symbol: "ETH", name: "Ethereum", question: "ETH above $3,540 at window close", marketProbability: 48, modelEstimate: 44, timeRemaining: "21:16", quality: "WATCH", spread: "4.6%", depth: "Limited", resolution: "Reference price at expiry" },
  { marketId: "DD-BTC-69200-03", symbol: "BTC", name: "Bitcoin", question: "BTC above $69,200 at window close", marketProbability: 37, modelEstimate: 32, timeRemaining: "36:04", quality: "NO TRADE", spread: "8.4%", depth: "Insufficient", resolution: "Reference price at expiry" },
];

export const orderBookRows = [
  { price: "0.68", size: "148.00", total: "100.64", tone: "ask" },
  { price: "0.67", size: "72.40", total: "48.51", tone: "ask" },
  { price: "0.66", size: "54.20", total: "35.77", tone: "ask" },
  { price: "0.64", size: "41.80", total: "26.75", tone: "bid" },
  { price: "0.63", size: "86.50", total: "54.50", tone: "bid" },
  { price: "0.62", size: "112.00", total: "69.44", tone: "bid" },
];

export const proofRecords = [
  { marketId: "DD-BTC-67100-09", event: "BTC above $67,100", forecast: "68% UP", market: "61% UP", model: "65% UP", outcome: "Resolved", result: "Correct direction", date: "21 Aug 2026" },
  { marketId: "DD-ETH-3380-04", event: "ETH above $3,380", forecast: "57% UP", market: "54% UP", model: "52% UP", outcome: "Resolved", result: "Forecast missed", date: "18 Aug 2026" },
  { marketId: "DD-BTC-68500-01", event: "BTC above $68,500", forecast: "72% UP", market: "64% UP", model: "71% UP", outcome: "Pending", result: "Awaiting resolution", date: "26 Aug 2026" },
];
