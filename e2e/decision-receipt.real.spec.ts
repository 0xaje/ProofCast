import { expect, test } from "@playwright/test";

const canRunDatabaseE2E = Boolean(process.env.E2E_DATABASE_URL);

test.describe("Decision Receipt database-backed E2E", () => {
  test.skip(!canRunDatabaseE2E, "Set E2E_DATABASE_URL to run the isolated authenticated database flow");

  test.use({
    extraHTTPHeaders: { "x-proofcast-e2e-user": "proofcast-e2e-user" },
  });

  test("commits through tRPC and database, refreshes, and inspects the owner receipt", async ({ page }) => {
    await page.goto("/market?market=e2e-market-1");
    await expect(page.getByTestId("forecast-workflow")).toContainText("Make your forecast specific.");
    await page.getByTestId("forecast-thesis").fill("The isolated test market has sustained bid support.");
    await page.getByTestId("forecast-counter-thesis").fill("The test market can still thin before expiry.");
    await page.getByTestId("confidence-high").click();
    await page.getByTestId("review-forecast").click();
    await expect(page.getByTestId("forecast-workflow")).toContainText("Review the record before committing.");
    await page.getByTestId("commit-receipt").click();
    await expect(page.getByTestId("receipt-committed")).toContainText("Your evidence is now recorded.");

    await page.goto("/proof");
    const receiptRow = page.getByTestId(/^receipt-row-/).first();
    await expect(receiptRow).toBeVisible();
    await receiptRow.click();
    await expect(page.getByTestId("receipt-detail")).toContainText("The isolated test market has sustained bid support.");

    await page.reload();
    const refreshedRow = page.getByTestId(/^receipt-row-/).first();
    await expect(refreshedRow).toBeVisible();
    await refreshedRow.click();
    await expect(page.getByTestId("receipt-detail")).toContainText("E2E test market resolves after the receipt is committed");
  });
});
