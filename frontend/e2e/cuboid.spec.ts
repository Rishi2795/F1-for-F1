import { expect, test } from "@playwright/test";

const tilted = (page: import("@playwright/test").Page) =>
  page.evaluate(() => [...document.querySelectorAll('[style*="perspective"] > *')].filter((el) => getComputedStyle(el).transform !== "none").length);

test.describe("driver page: pinned card and turning cards", () => {
  test("on a laptop the left card stays put while the right cards roll past, tilting as they go", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/driver/VER");
    const card = page.getByTestId("driver-card");
    await expect(card).toBeVisible();
    const tops: number[] = [];
    let sawTilt = false;
    for (const y of [300, 500, 700]) { // while the right-hand cards are still going past
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(400);
      tops.push(Math.round((await card.boundingBox())!.y));
      if ((await tilted(page)) > 0) sawTilt = true;
    }
    expect(new Set(tops).size).toBe(1); // it did not move while the page scrolled
    expect(tops[0]).toBeLessThan(60); // and it is held near the top of the screen
    expect(sawTilt).toBe(true);
  });

  test("on a phone the cards are plain: no tilt, and the card is part of the page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/driver/VER");
    await expect(page.getByRole("heading", { name: "This page hit an error" })).toHaveCount(0); // it must not crash
    await expect(page.getByTestId("driver-card")).toBeVisible();
    expect(errors).toEqual([]);
    await page.evaluate(() => window.scrollTo(0, 900));
    await page.waitForTimeout(400);
    expect(await tilted(page)).toBe(0);
    expect(Math.round((await page.getByTestId("driver-card").boundingBox())!.y)).toBeLessThan(0); // scrolled away with the page
  });

  test("a tablet shows the page normally, with no tilt and no error", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/driver/VER");
    await expect(page.getByRole("heading", { name: "This page hit an error" })).toHaveCount(0);
    await expect(page.getByTestId("driver-card")).toBeVisible();
    await expect(page.getByText("2026 SEASON").first()).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 700));
    await page.waitForTimeout(300);
    expect(await tilted(page)).toBe(0);
  });

  test("with reduced motion nothing tilts", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/driver/VER");
    await page.evaluate(() => window.scrollTo(0, 700));
    await page.waitForTimeout(400);
    expect(await tilted(page)).toBe(0);
  });
});
