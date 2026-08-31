/* Proofcast / Signal Room: route-level views share a single rail-based application shell. */
import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import { WalletProvider } from "./contexts/WalletContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// Lazy-loaded routes for code splitting and instant bundle load
const Landing = lazy(() => import("./pages/Landing"));
const Home = lazy(() => import("./pages/Home"));
const MarketDecision = lazy(() => import("./pages/MarketDecision"));
const ProofProfile = lazy(() => import("./pages/ProofProfile"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

function PageLoader() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#080b10] text-[#f5f6f2]">
      <div className="relative flex flex-col items-center">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute h-full w-full animate-ping rounded-2xl bg-[#d7f36b]/10 opacity-75" />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-[#d7f36b]/40 bg-[#d7f36b]/10 shadow-[0_0_25px_rgba(215,243,107,0.2)]">
            <span className="font-mono text-base font-black text-[#d7f36b]">PC</span>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#d7f36b]" />
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8b96a8]">
            Loading Proof Instrument…
          </span>
        </div>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/signal" component={Home} />
        <Route path="/market" component={MarketDecision} />
        <Route path="/proof" component={ProofProfile} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/arena">
          {() => <Leaderboard />}
        </Route>
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <WalletProvider>
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </WalletProvider>
    </ErrorBoundary>
  );
}
