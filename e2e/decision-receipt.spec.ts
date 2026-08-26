import { expect, test, type Page, type Route } from "@playwright/test";

const market = {
  marketId: "market-1",
  marketAddress: "0xmarket",
  poolAddress: "0xpool",
  asset: "BTC",
  question: "BTC closes above its opening price",
  indexedStatus: "Trading",
  marketState: "TRADING",
  tradingStart: Date.now() - 60_000,
  expiry: Date.now() + 600_000,
  secondsToExpiry: 600,
  lastPricePercent: 61.25,
  bestBidPercent: 60.5,
  bestAskPercent: 62,
  midPercent: 61.25,
  spreadBps: 246,
  yesBids: [{ pricePercent: 60.5, quantity: "12.5" }],
  yesAsks: [{ pricePercent: 62, quantity: "8" }],
};

const snapshot = {
  state: "LIVE",
  asOf: Date.now(),
  ageMs: 0,
  network: "somnia-mainnet",
  chainId: 5031,
  provenance: { indexer: "test-indexer", orderBook: "on-chain binary pool read", method: "official @somnia-chain/markets-sdk (read-only)" },
  markets: [market],
  message: "Verified snapshot",
};

function trpcResult(json: unknown) {
  return { result: { data: { json } } };
}

async function mockReceiptNetwork(page: Page) {
  let receipts: any[] = [];
  await page.route("**/api/trpc/**", async (route: Route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.split("/").pop() ?? "";
    const operations = path.split(",");
    const url = new URL(request.url());
    const body = request.method() === "POST" ? JSON.parse(request.postData() ?? "{}") : null;
    const queryInput = url.searchParams.get("input");
    const parsedQuery = queryInput ? JSON.parse(queryInput) : null;
    const input = body?.[0]?.json?.json ?? body?.[0]?.json ?? parsedQuery?.["0"]?.json?.json ?? parsedQuery?.["0"]?.json ?? {};
    const response = operations.map(operation => {
      if (operation === "auth.me") return trpcResult({ id: 7, openId: "e2e-user", name: "E2E User", role: "user" });
      if (operation === "dreamdex.snapshot") return trpcResult(snapshot);
      if (operation === "receipts.listMine") return trpcResult(receipts);
      if (operation === "receipts.getMineById") return trpcResult(receipts.find(receipt => receipt.id === input.id) ?? null);
      if (operation === "receipts.create") {
        const receipt = {
          id: 41,
          userId: 7,
          forecastId: 51,
          marketSnapshotId: 61,
          version: 1,
          createdAt: new Date().toISOString(),
          forecast: { id: 51, userId: 7, marketId: market.marketId, direction: input.direction, probabilityBps: input.probabilityBps, confidence: input.confidence, thesis: input.thesis, counterThesis: input.counterThesis, status: "COMMITTED", committedAt: new Date().toISOString() },
          marketSnapshot: { id: 61, marketId: market.marketId, asset: market.asset, question: market.question, marketState: market.marketState, network: snapshot.network, capturedAt: new Date().toISOString(), provenance: snapshot.provenance, orderBook: { yesBids: market.yesBids, yesAsks: market.yesAsks } },
          revisions: [],
          resolutions: [],
        };
        receipts = [receipt, ...receipts];
        return trpcResult(receipt);
      }
      return trpcResult(null);
    });
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
}

test.describe("Decision Receipt browser flow", () => {
  test("saves a reviewed forecast, survives refresh, and can be inspected", async ({ page }) => {
    await mockReceiptNetwork(page);
    await page.goto("/market?market=market-1");

    await expect(page.getByTestId("forecast-workflow")).toContainText("Make your forecast specific.");
    await page.getByTestId("forecast-thesis").fill("Bid support is holding into the trading window.");
    await page.getByTestId("forecast-counter-thesis").fill("The visible book can thin before expiry.");
    await page.getByTestId("confidence-high").click();
    await page.getByTestId("review-forecast").click();
    await expect(page.getByTestId("forecast-workflow")).toContainText("Review the record before committing.");
    await page.getByTestId("commit-receipt").click();
    await expect(page.getByTestId("receipt-committed")).toContainText("Your evidence is now recorded.");

    await page.goto("/proof");
    await expect(page.getByTestId("receipt-ledger")).toContainText("Receipt #41");
    await page.getByTestId("receipt-row-41").click();
    await expect(page.getByTestId("receipt-detail")).toContainText("Bid support is holding into the trading window.");

    await page.reload();
    await expect(page.getByTestId("receipt-ledger")).toContainText("Receipt #41");
    await page.getByTestId("receipt-row-41").click();
    await expect(page.getByTestId("receipt-detail")).toContainText("BTC closes above its opening price");
  });
});
