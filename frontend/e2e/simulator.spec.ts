import { expect, test } from "@playwright/test";

test.describe("strategy simulator", () => {
  test("opens with a legal fastest plan for the chosen circuit", async ({ page }) => {
    await page.goto("/simulation");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Strategy/i);
    await expect(page.getByRole("list", { name: "Stints" }).getByRole("listitem")).toHaveCount(2);
    await expect(page.getByRole("status").filter({ hasText: /laps · 1 stop/ })).toBeVisible();
  });

  test("an illegal plan is explained and cannot be run", async ({ page }) => {
    await page.goto("/simulation");
    await page.getByRole("group", { name: "Stint 2 tyre" }).getByRole("button", { name: "Medium" }).click();
    await page.getByRole("group", { name: "Stint 1 tyre" }).getByRole("button", { name: "Medium" }).click();
    await expect(page.getByRole("alert")).toContainText(/two different compounds/);
    await expect(page.getByRole("button", { name: /Run 300 races/ })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Race it live" })).toBeDisabled();
  });

  test("running the races reports where the car finishes, what-ifs and a sample race", async ({ page }) => {
    await page.goto("/simulation");
    await page.getByRole("button", { name: /Run 300 races/ }).click();
    await expect(page.getByText("Where it finishes")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Average finish").first()).toBeVisible();
    await expect(page.getByRole("table", { name: /different race scenarios/ }).locator("tbody tr")).toHaveCount(4);
    await expect(page.getByText("One sample race")).toBeVisible();
    // changing the setup makes the old answer stale rather than leaving it on screen
    await page.getByRole("button", { name: "Rain", exact: true }).click();
    await expect(page.getByText(/has changed since the last run/)).toBeVisible();
  });

  test("a different circuit gives a different plan and race length", async ({ page }) => {
    await page.goto("/simulation");
    await page.getByLabel("Grand Prix").selectOption("monte-carlo");
    await expect(page.getByRole("status").filter({ hasText: /^78 laps/ })).toBeVisible();
  });

  test("racing live: the order, the tyre and a pit call all work", async ({ page }) => {
    await page.goto("/simulation");
    await page.getByRole("button", { name: "Race it live" }).click();
    await expect(page.getByRole("table", { name: "Running order" }).locator("tbody tr")).toHaveCount(22);
    await page.getByRole("button", { name: "Next lap" }).click();
    await page.getByRole("button", { name: "Box for Hard" }).click();
    await page.getByRole("button", { name: "Next lap" }).click();
    await expect(page.getByRole("region", { name: "Race log" }).getByText(/Box: . to H/)).toBeVisible();
    await page.getByRole("button", { name: "10×" }).click();
    await page.getByRole("button", { name: "Play" }).click();
    await expect(page.getByText("Chequered flag")).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: "Back to setup" }).click();
    await expect(page.getByText("Your strategy")).toBeVisible();
  });

  test("the model card says what is measured and what is assumed", async ({ page }) => {
    await page.goto("/simulation");
    await page.getByText("How this simulator works, and what is assumed").click();
    await expect(page.getByText("Measured from real races")).toBeVisible();
    await expect(page.getByText("Assumed, not measured")).toBeVisible();
  });

  test("works on a phone with no sideways scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/simulation");
    await expect(page.getByText("Your strategy")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Race it live" }).click();
    await expect(page.getByRole("table", { name: "Running order" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
});
