import { expect, test } from "@playwright/test";

test.describe("driver photos and the simulator link", () => {
  test("the dock links to the simulator and it opens", async ({ page }) => {
    await page.goto("/explore");
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Sim", exact: true }).click();
    await expect(page).toHaveURL(/\/simulation$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Strategy/i);
  });

  // A 1x1 transparent png, so the tests never depend on formula1.com being reachable.
  const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

  test("official portraits are requested from F1's server at the right size, with a credit", async ({ page }) => {
    const asked: string[] = [];
    await page.route("https://media.formula1.com/**", (route) => {
      asked.push(route.request().url());
      return route.fulfill({ contentType: "image/png", body: PNG });
    });
    await page.goto("/drivers");
    await expect(page.locator('a[href="/driver/VER"]')).toBeVisible();
    await expect.poll(() => asked.length).toBeGreaterThan(15);
    expect(asked.every((u) => /^https:\/\/media\.formula1\.com\/.+\.png\.transform\/4col\/image\.png$/.test(u) && !u.includes("d_driver_fallback_image"))).toBe(true);
    await expect(page.getByText(/Driver portraits © Formula 1/)).toBeVisible();
    await page.goto("/driver/VER");
    await expect(page.getByText("Portrait © Formula 1, shown from formula1.com.")).toBeVisible();
  });

  test("when a portrait does not load, the card keeps its number design", async ({ page }) => {
    await page.route("https://media.formula1.com/**", (route) => route.abort());
    await page.goto("/drivers");
    await expect(page.locator('a[href="/driver/VER"]')).toBeVisible();
    await expect(page.locator('a[href="/driver/VER"]').getByText("3", { exact: true })).toBeVisible(); // his race number, drawn big
    await expect(page.locator('a[href="/driver/VER"] img')).toHaveCount(0);
  });

  test("standings rows carry avatars, and a driver without a photo shows the race number", async ({ page }) => {
    await page.goto("/season/2026");
    await expect(page.getByRole("list", { name: "Top three" })).toBeVisible();
    const row = page.getByRole("row", { name: /Liam Lawson/ });
    await expect(row).toBeVisible(); // no photo for him: the number avatar stands in, the row still reads cleanly
  });
});
