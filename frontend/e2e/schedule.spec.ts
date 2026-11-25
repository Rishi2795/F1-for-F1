import { expect, test } from "@playwright/test";

test.describe("schedule, news and possible standings", () => {
  test("the schedule shows what is next, with a timetable and a forecast", async ({ page }) => {
    await page.goto("/schedule");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("region", { name: /./ }).first()).toBeVisible();
    await expect(page.getByRole("list").filter({ hasText: "Forecast →" }).first()).toBeVisible();
    await page.getByRole("button", { name: "DONE" }).click();
    await expect(page.getByRole("list").getByRole("link", { name: "Forecast →", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Results →" }).first()).toBeVisible();
  });

  test("the news page links out safely and can be filtered by publisher", async ({ page }) => {
    await page.goto("/news");
    const first = page.locator("ul a[href^='https://']").first();
    await expect(first).toBeVisible();
    await expect(first).toHaveAttribute("target", "_blank");
    await expect(first).toHaveAttribute("rel", /noopener/);
    const filters = page.getByRole("group", { name: "Filter by publisher" }).getByRole("button");
    if ((await filters.count()) > 2) {
      await filters.nth(1).click();
      await expect(filters.nth(1)).toHaveAttribute("aria-pressed", "true");
    }
  });

  test("the forecast shows possible final standings", async ({ page }) => {
    await page.goto("/forecast");
    await expect(page.getByRole("table", { name: /Possible final/ })).toBeVisible();
  });
});
