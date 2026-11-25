import { expect, test } from "@playwright/test";

test.describe("typeface", () => {
  test("the dot look is the default, the classic one is a click away, and the choice is remembered", async ({ page }) => {
    await page.goto("/about_app");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dot");
    const family = () => page.getByRole("heading", { level: 1 }).evaluate((el) => getComputedStyle(el).fontFamily);
    await expect.poll(family).toContain("Doto"); // headlines are marked a moment after the page renders
    const toggle = page.getByRole("group", { name: "Typeface" });
    await toggle.scrollIntoViewIfNeeded();
    await toggle.getByRole("button", { name: "Classic" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "classic");
    await expect.poll(family).not.toContain("Doto");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "classic"); // remembered on this device
    await page.getByRole("group", { name: "Typeface" }).getByRole("button", { name: "Dot" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dot");
  });

  test("no dot-matrix text is used at sizes where it cannot be read", async ({ page }) => {
    await page.goto("/season/2026");
    await expect(page.getByRole("list", { name: "Top three" })).toBeVisible();
    const sizes = await page.evaluate(() =>
      [...document.querySelectorAll("*")].filter((el) => getComputedStyle(el).fontFamily.includes("Doto") && el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()))
        .map((el) => parseFloat(getComputedStyle(el).fontSize)));
    expect(sizes.length).toBeGreaterThan(0);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(24); // headlines and big numbers only
  });
});
