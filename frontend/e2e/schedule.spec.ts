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

  test("on a phone the schedule is a countdown, a weekend card and a deck of rounds you swipe, opening on the next race", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/schedule");
    await expect(page.getByRole("timer")).toBeVisible();
    await expect(page.getByLabel("This weekend")).toBeVisible();
    const strip = page.getByRole("group", { name: "Jump to a round" });
    await expect(strip.getByRole("button").first()).toBeVisible();
    const deck = page.getByRole("list", { name: /Rounds, swipe sideways/ });
    await expect(deck).toBeVisible();
    // the deck opens on the next race (scrolled sideways to it), and the strip agrees
    await deck.scrollIntoViewIfNeeded();
    await expect(deck.locator("li").filter({ hasText: "NEXT" }).first()).toBeInViewport();
    await expect(strip.locator("[aria-current=true]")).toHaveCount(1);
    // the filter reaches finished rounds, with their results
    await page.getByRole("button", { name: "DONE" }).click();
    await expect(deck.getByRole("link", { name: "Results →" }).first()).toBeAttached();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });

  test("the full race list is one tap from the calendar, and back", async ({ page }) => {
    await page.goto("/schedule");
    const tabs = page.getByRole("navigation", { name: "Races" });
    await expect(tabs.getByRole("link", { name: "Calendar" })).toHaveAttribute("aria-current", "page");
    await tabs.getByRole("link", { name: /All races/ }).click();
    await expect(page).toHaveURL(/\/explore$/);
    await expect(page.getByRole("navigation", { name: "Races" }).getByRole("link", { name: /All races/ })).toHaveAttribute("aria-current", "page");
    await page.getByRole("navigation", { name: "Races" }).getByRole("link", { name: "Calendar" }).click();
    await expect(page).toHaveURL(/\/schedule$/);
  });

  test("on a phone the rounds can be read as a list, then as cards again", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/schedule");
    await page.getByRole("button", { name: "List" }).click();
    const list = page.getByRole("list", { name: "All rounds" });
    await expect(list).toBeVisible();
    await page.getByRole("button", { name: "DONE" }).click();
    await expect(list.getByRole("link", { name: "Results →" }).first()).toBeVisible();
    await page.getByRole("button", { name: "Cards" }).click();
    await expect(page.getByRole("list", { name: /Rounds, swipe sideways/ })).toBeVisible();
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

  test("the pit wall is a 3D ring: arrows, the tool strip, the keyboard and dragging all turn it", async ({ page }) => {
    await page.goto("/pitwall");
    const region = page.getByRole("region", { name: "Pit wall tools" });
    await expect(region.getByText(/01 \/ 09/)).toBeVisible();
    await region.getByRole("button", { name: "Next tool" }).click();
    await expect(region.getByText(/02 \/ 09/)).toBeVisible();
    await region.getByRole("button", { name: "Circuits", exact: true }).click();
    await expect(region.getByText(/06 \/ 09/)).toBeVisible();
    await region.getByRole("button", { name: "Next tool" }).click();
    await region.getByRole("button", { name: "Next tool" }).click();
    await region.getByRole("button", { name: "Next tool" }).click();
    await expect(region.getByText(/09 \/ 09/)).toBeVisible();
    await region.getByRole("button", { name: "Next tool" }).click(); // the ring keeps going round
    await expect(region.getByText(/01 \/ 09/)).toBeVisible();

    const ring = page.getByLabel("Turn the ring with the arrow keys, the scroll wheel, or drag it");
    await ring.focus();
    await page.keyboard.press("ArrowRight");
    await expect(region.getByText(/02 \/ 09/)).toBeVisible();
    await page.keyboard.press("End");
    await expect(region.getByText(/09 \/ 09/)).toBeVisible();

    const box = (await ring.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 60);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 260, box.y + 60, { steps: 8 });
    await page.mouse.up();
    await expect(region.getByText(/09 \/ 09/)).toHaveCount(0); // a drag turned it
    expect(page.url()).toMatch(/\/pitwall$/); // and did not open the card under the pointer
  });

  test("scrolling the wheel over the ring turns it", async ({ page }) => {
    await page.goto("/pitwall");
    const region = page.getByRole("region", { name: "Pit wall tools" });
    await expect(region.getByText(/01 \/ 09/)).toBeVisible();
    const box = (await page.getByLabel(/Turn the ring/).boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 120);
    await expect(region.getByText(/02 \/ 09/)).toBeVisible();
    await page.waitForTimeout(500);
    await page.mouse.wheel(0, -120);
    await expect(region.getByText(/01 \/ 09/)).toBeVisible();
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
