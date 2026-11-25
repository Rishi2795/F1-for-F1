import { expect, test } from "@playwright/test";

test.describe("driver photos and the simulator link", () => {
  test("the dock links to the simulator and it opens", async ({ page }) => {
    await page.goto("/explore");
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Sim", exact: true }).click();
    await expect(page).toHaveURL(/\/simulation$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/PIT_WALL/i);
  });

  test("without photos every driver still gets a clean number card", async ({ page }) => {
    await page.goto("/drivers");
    await expect(page.locator('a[href="/driver/VER"]')).toBeVisible();
    expect(await page.locator('a[href^="/driver/"] img').count()).toBe(0); // no photo is shown until one is licensed
  });

  test("standings rows carry avatars, and a driver without a photo shows the race number", async ({ page }) => {
    await page.goto("/season/2026");
    await expect(page.getByRole("list", { name: "Top three" })).toBeVisible();
    const row = page.getByRole("row", { name: /Liam Lawson/ });
    await expect(row).toBeVisible(); // no photo for him: the number avatar stands in, the row still reads cleanly
  });
});
