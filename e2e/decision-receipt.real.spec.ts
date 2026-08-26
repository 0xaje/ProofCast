import { expect, test } from "@playwright/test";

const canRunDatabaseE2E = Boolean(process.env.E2E_DATABASE_URL);

test.describe("Decision Receipt database-backed E2E", () => {
  test.skip(!canRunDatabaseE2E, "Set E2E_DATABASE_URL to run the isolated authenticated database flow");

  test.use({
    extraHTTPHeaders: { "x-proofcast-e2e-user": "proofcast-e2e-user" },
  });

  test("commits through tRPC and database, refreshes, and inspects the owner receipt", async ({ page, browser }) => {
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

    await page.getByTestId("revise-receipt").click();
    const revisionForm = page.getByTestId("revision-form");
    await revisionForm.locator("textarea").nth(0).fill("The revised thesis still sees sustained bid support.");
    await revisionForm.locator("textarea").nth(1).fill("Liquidity can weaken before the test expiry.");
    await revisionForm.getByRole("button", { name: "Commit revision" }).click();
    await expect(page.getByTestId(/^revision-row-/).first()).toContainText("Revision 1");

    const resolutionForm = page.getByTestId("resolution-form");
    await resolutionForm.locator("input[type=url]").fill("https://example.com/verified-outcome");
    await resolutionForm.locator("textarea").fill("The isolated resolution source confirms the test outcome.");
    await resolutionForm.getByRole("button", { name: "Submit for verification" }).click();
    await expect(page.getByTestId(/^resolution-row-/).first()).toContainText("SUBMITTED");
    const resolutionTestId = await page.getByTestId(/^resolution-row-/).first().getAttribute("data-testid");
    const resolutionId = Number(resolutionTestId?.replace("resolution-row-", ""));
    expect(resolutionId).toBeGreaterThan(0);

    const adminContext = await browser.newContext({ extraHTTPHeaders: { "x-proofcast-e2e-user": "proofcast-e2e-admin" } });
    const adminPage = await adminContext.newPage();
    const reviewResponse = await adminPage.request.post("/api/trpc/receipts.verifyResolutionEvidence", { data: { json: { resolutionId, status: "VERIFIED" } } });
    expect(reviewResponse.ok()).toBe(true);
    await adminContext.close();

    await page.reload();
    const postRevisionRow = page.getByTestId(/^receipt-row-/).first();
    await expect(postRevisionRow).toBeVisible();
    await postRevisionRow.click();
    await expect(page.getByTestId("receipt-detail")).toContainText("The revised thesis still sees sustained bid support.");
    await expect(page.locator(".pi-score-strip")).toContainText("100.0%");
    await expect(page.getByTestId("calibration-metrics")).toContainText("Predicted 50.0% / observed 100.0%");
    await expect(page.getByTestId(/^revision-row-/).first()).toContainText("Revision 1");
    await expect(page.getByTestId(/^resolution-row-/).first()).toContainText("VERIFIED");
  });
});
