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

  test("the pit wall is a carousel: arrows, the tool strip and the keyboard all move it", async ({ page }) => {
    await page.goto("/pitwall");
    const region = page.getByRole("region", { name: "Pit wall tools" });
    await expect(region.getByText(/01 \/ 09/)).toBeVisible();
    await region.getByRole("button", { name: "Next tool" }).click();
    await expect(region.getByText(/02 \/ 09/)).toBeVisible();
    await region.getByRole("button", { name: "Circuits", exact: true }).click();
    await expect(region.getByText(/06 \/ 09/)).toBeVisible({ timeout: 5000 });
    await expect(region.getByRole("button", { name: "Previous tool" })).toBeEnabled();
    await page.getByLabel("Swipe, scroll or use the arrow keys").focus();
    await page.keyboard.press("Home");
    await expect(region.getByText(/01 \/ 09/)).toBeVisible({ timeout: 5000 });
  });

  test("methodology has a summary board and an index that jumps to a chapter", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/methodology");
    await expect(page.getByText("Races fully covered")).toBeVisible();
    const toc = page.getByRole("navigation", { name: "On this page" });
    await expect(toc.getByRole("link")).toHaveCount(8);
    await toc.getByRole("link", { name: /The strategy simulator/ }).click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);
    await expect(page.getByText("Measured from real races")).toBeVisible();
  });

  test("the ratings speak neutrally about drivers and cars", async ({ page }) => {
    await page.goto("/ratings");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/Car rating leads/).first()).toBeVisible();
    await expect(page.getByText(/not a verdict on anyone/)).toBeVisible();
    for (const word of ["Carried by the car", "being carried", "Struggling"]) await expect(page.getByText(word)).toHaveCount(0);
  });

  test("the championship table flows with the page: no scrolling inside it", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/season/2024");
    const table = page.getByRole("table", { name: /standings after round/ });
    await expect(table).toBeVisible();
    const box = await table.locator("xpath=..").evaluate((el) => ({ over: getComputedStyle(el).overflowY, scrolls: el.scrollHeight > el.clientHeight + 1 }));
    expect(box.scrolls).toBe(false);
  });

  test("news items are grouped by day and every publisher keeps one colour", async ({ page }) => {
    await page.goto("/news");
    await expect(page.locator("main section[aria-label] h2").first()).toBeVisible();
    await expect(page.getByText("Last 24 hours")).toBeVisible();
    const colours = await page.locator("main ul a[href^='https://']").evaluateAll((as) => {
      const seen: Record<string, Set<string>> = {};
      for (const a of as) {
        const name = a.querySelector("p span")?.textContent ?? "";
        (seen[name] ||= new Set()).add(getComputedStyle(a).borderLeftColor);
      }
      return Object.values(seen).map((set) => set.size);
    });
    expect(colours.length).toBeGreaterThan(1);
    for (const n of colours) expect(n).toBe(1); // one colour per publisher
  });
});
