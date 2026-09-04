import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  if (process.env.NODE_ENV !== "production" && process.env.PROOFCAST_E2E === "1") {
    const testOpenId = opts.req.headers["x-proofcast-e2e-user"];
    if (typeof testOpenId === "string") {
      const testUser = await import("../db").then(({ getUserByOpenId, upsertUser }) =>
        getUserByOpenId(testOpenId).then(async existing => {
          if (existing) return existing;
          const role = testOpenId === "proofcast-e2e-admin" ? "admin" : "user";
          await upsertUser({ openId: testOpenId, name: role === "admin" ? "E2E Test Administrator" : "E2E Test User", loginMethod: "e2e", role });
          return getUserByOpenId(testOpenId);
        }),
      );
      user = testUser ?? null;
    }
  }

  try {
    if (user) return { req: opts.req, res: opts.res, user };
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Support Web3 connected wallet authentication
  if (!user) {
    const walletHeader = opts.req.headers["x-wallet-address"];
    if (typeof walletHeader === "string" && /^0x[a-fA-F0-9]{40}$/.test(walletHeader.trim())) {
      const walletAddr = walletHeader.trim().toLowerCase();
      try {
        const dbUser = await import("../db").then(({ getUserByOpenId, upsertUser }) =>
          getUserByOpenId(walletAddr).then(async existing => {
            if (existing) return existing;
            const shortName = `${walletAddr.slice(0, 6)}…${walletAddr.slice(-4)}`;
            await upsertUser({ openId: walletAddr, name: shortName, loginMethod: "web3-wallet", role: "user" });
            return getUserByOpenId(walletAddr);
          }),
        );
        user = dbUser ?? null;
      } catch (err) {
        console.warn("[Context] Failed to authenticate via wallet header:", err);
      }

      // If database is not configured, provide in-memory fallback user for this wallet
      if (!user) {
        const shortName = `${walletAddr.slice(0, 6)}…${walletAddr.slice(-4)}`;
        user = {
          id: 1,
          openId: walletAddr,
          name: shortName,
          email: `${walletAddr.slice(0, 8)}@somnia.user`,
          loginMethod: "web3-wallet",
          role: "user",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        };
      }
    }
  }

  // Development convenience fallback so local testing works seamlessly
  if (!user && process.env.NODE_ENV !== "production") {
    user = {
      id: 1,
      openId: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      name: "Somnia Forecaster",
      email: "forecaster@somnia.network",
      loginMethod: "dev-local",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
