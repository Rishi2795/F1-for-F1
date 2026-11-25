import { expect, test } from "@playwright/test";

test.describe("about page", () => {
  test("hero, live numbers and links to real pages", async ({ page }) => {
    await page.goto("/about_app");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("The race");
    await expect(page.getByRole("img", { name: /fastest laps racing round it/ })).toBeVisible();
    await expect(page.getByRole("list", { name: /Running order of the replayed laps/ })).toBeVisible(); // real telemetry loaded
    const numbers = page.getByLabel("The data in numbers");
    await numbers.scrollIntoViewIfNeeded();
    await expect(numbers).toContainText("seasons covered");
    for (const href of ["/explore", "/forecast", "/ratings", "/pitwall", "/team-pace", "/circuits", "/duels", "/play"]) {
      await expect(page.locator(`a[href="${href}"]`).first()).toBeAttached();
    }
  });

  test("with reduced motion the hero is still and complete", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/about_app");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("explained");
    await expect(page.getByRole("button", { name: /explore the races/i }).or(page.getByRole("link", { name: /explore the races/i }))).toBeVisible();
  });
});
