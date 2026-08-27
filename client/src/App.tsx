/* Proofcast / Signal Room: route-level views share a single rail-based application shell. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import MarketDecision from "./pages/MarketDecision";
import ProofProfile from "./pages/ProofProfile";
import Leaderboard from "./pages/Leaderboard";
import AdminReviewQueue from "./pages/AdminReviewQueue";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/signal" component={Home} />
      <Route path="/market" component={MarketDecision} />
      <Route path="/proof" component={ProofProfile} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/admin/review" component={AdminReviewQueue} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}
export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

