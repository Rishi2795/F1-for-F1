import { expect, test } from "@playwright/test";

test.describe("scroll position", () => {
  test("a new page starts at the top, and so does coming back to one", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/drivers");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 1400));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(800);

    await page.locator("main a[href^='/driver/']").first().click({ force: true });
    await expect(page).toHaveURL(/\/driver\/[A-Z]{3}$/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

    await page.evaluate(() => window.scrollTo(0, 600));
    await page.goBack();
    await expect(page).toHaveURL(/\/drivers$/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0); // not where it was left
  });

  test("a link to a section of a page still scrolls to that section", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/forecast#accuracy");
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 15_000 }).toBeGreaterThan(300);
    const top = await page.locator("#accuracy").evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeLessThan(400);
  });

  test("switching tabs or seasons on a page does not throw you back to the top", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/season/2024");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.getByRole("tab", { name: /constructors/i }).evaluate((el) => (el as HTMLElement).click()); // a script click: no scrolling of its own
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(200);
  });

  test("on a laptop the whole championship table fits one screen, without scrolling inside it", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto("/season/2026");
    const section = page.locator("section[aria-labelledby=table-h]");
    await expect(section.locator("tbody tr").first()).toBeVisible();
    const box = await section.evaluate((el) => ({ h: el.getBoundingClientRect().height, rows: el.querySelectorAll("tbody tr").length }));
    expect(box.rows).toBeGreaterThan(15);
    expect(box.h).toBeLessThanOrEqual(800);
  });
});
