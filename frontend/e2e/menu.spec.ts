import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("menu", () => {
  test("the dock fades when idle and comes back with any movement", async ({ page }) => {
    await page.goto("/explore");
    const dock = page.getByRole("navigation", { name: "Main" });
    await expect.poll(() => dock.evaluate((el) => getComputedStyle(el).opacity), { timeout: 8000 }).toBe("0");
    await page.mouse.move(300, 300);
    await expect.poll(() => dock.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  });

  test("the menu lists every part of the site, opens a page, and closes", async ({ page }) => {
    await page.goto("/explore");
    await page.getByRole("button", { name: "Menu" }).click();
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu).toBeVisible();
    for (const name of ["Races", "Standings", "Drivers", "Circuits", "Forecast", "Worth watching", "Driver or car?", "Teammate duels", "Team pace", "Pit Wall", "Simulator", "Beat the model", "My driver", "About", "Methodology"]) {
      await expect(menu.getByRole("link", { name: new RegExp(`^${name.replace("?", "\\?")}`) })).toBeVisible(); // each link reads "Title description"
    }
    await expect(menu.getByRole("link", { name: /^Races/ })).toHaveAttribute("aria-current", "page");
    await menu.getByRole("link", { name: /^Circuits/ }).click();
    await expect(page).toHaveURL(/\/circuits$/);
    await expect(menu).toHaveCount(0); // going somewhere closes it
  });

  test("Escape closes the menu and gives focus back to the button", async ({ page }) => {
    await page.goto("/explore");
    const button = page.getByRole("button", { name: "Menu" });
    await button.click();
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Menu" })).toHaveCount(0);
    await expect(button).toBeFocused();
  });

  test("the menu has no serious accessibility violations", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/explore", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Menu" }).click();
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
    const results = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`);
    expect(serious).toEqual([]);
  });

  test("on a phone the menu fits without sideways scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/explore");
    await page.getByRole("button", { name: "Menu" }).click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
