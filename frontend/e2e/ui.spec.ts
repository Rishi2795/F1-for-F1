import { expect, test, type Page } from "@playwright/test";

/** Collect real JavaScript errors (404/422 network noise from deliberately bad URLs is ignored). */
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

test.describe("calendar", () => {
  test("lists every race, switches season, filters, opens a race by keyboard", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/explore");
    const cards = page.locator("button:has(h3)");
    await expect(cards).toHaveCount(23); // 2026 calendar
    await page.getByRole("button", { name: /change season/i }).click();
    await page.getByRole("button", { name: "2024", exact: true }).click();
    await expect(cards).toHaveCount(24);
    await page.getByLabel("Search races").fill("monaco");
    await expect(cards).toHaveCount(1);
    await cards.first().focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/race\/2024\/8$/);
    await expect(page.getByRole("heading", { name: /Monaco/i }).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("Escape closes the season picker", async ({ page }) => {
    await page.goto("/explore");
    await page.getByRole("button", { name: /change season/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("a race that has not happened is disabled, not a dead end", async ({ page }) => {
    await page.goto("/explore");
    const upcoming = page.locator("button:has(h3):disabled");
    await expect(upcoming.first()).toBeVisible();
  });
});

test.describe("race page", () => {
  test("driver rows expand and collapse with mouse and keyboard; tyre bar is readable", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/race/2025/6");
    const row = page.getByRole("button", { name: /Oscar Piastri/ });
    await row.scrollIntoViewIfNeeded();
    await expect(row).toHaveAttribute("aria-expanded", "false");
    await row.click();
    await expect(row).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("img", { name: /Tyre strategy: MEDIUM \d+ laps, then HARD \d+ laps/ }).first()).toBeVisible();
    await row.press("Enter");
    await expect(row).toHaveAttribute("aria-expanded", "false");
    await row.press(" ");
    await expect(row).toHaveAttribute("aria-expanded", "true");
    expect(errors).toEqual([]);
  });

  test("compare tool shows two drivers side by side", async ({ page }) => {
    await page.goto("/race/2024/8");
    const selects = page.locator("select");
    await selects.nth(0).selectOption("LEC");
    await selects.nth(1).selectOption("VER");
    await expect(page.getByText("VERSUS")).toBeVisible();
  });

  test("team grid has no empty filler cells: every row is fully covered", async ({ page }) => {
    await page.goto("/race/2026/11");
    const grid = page.locator('section:has-text("Constructor") div.flex.flex-wrap').first();
    await expect(grid.locator("> div").first()).toBeVisible();
    const rows = await grid.evaluate((el) => {
      const byRow = new Map<number, { w: number; n: number }>();
      for (const c of Array.from(el.children)) {
        const r = c.getBoundingClientRect();
        const key = Math.round(r.top);
        const cur = byRow.get(key) ?? { w: 0, n: 0 };
        byRow.set(key, { w: cur.w + r.width, n: cur.n + 1 });
      }
      return { width: el.getBoundingClientRect().width, rows: [...byRow.values()] };
    });
    for (const r of rows.rows) expect(r.w + (r.n - 1)).toBeGreaterThan(rows.width - 2); // card widths + 1px gaps
  });

  test("a partial-data race says so instead of showing guesses", async ({ page }) => {
    await page.goto("/race/2021/12");
    await expect(page.getByText(/Some data is unavailable/)).toBeVisible();
  });
});

test.describe("bad addresses never leave a blank or endless-loading page", () => {
  test("unknown URL shows the not-found page", async ({ page }) => {
    await page.goto("/definitely/not/a/page");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await expect(page).toHaveTitle(/Page not found/);
  });

  test("malformed race link explains itself", async ({ page }) => {
    await page.goto("/race/abc/1");
    await expect(page.getByRole("heading", { name: "We couldn't find that race" })).toBeVisible();
    await expect(page.locator('[role="status"]')).toHaveCount(0); // no skeleton
  });

  test("out-of-range race and unknown driver show clear messages", async ({ page }) => {
    await page.goto("/race/2026/99");
    await expect(page.getByRole("heading", { name: "We couldn't find that race" })).toBeVisible();
    await page.goto("/driver/XYZ");
    await expect(page.getByRole("heading", { name: "We couldn't find that driver" })).toBeVisible();
  });

  test("an upcoming race says it has not happened yet", async ({ page }) => {
    await page.goto("/race/2026/22");
    await expect(page.getByRole("heading", { name: "This race hasn't happened yet" })).toBeVisible();
  });
});

test.describe("resilience", () => {
  test("API outage shows an error with retry, and retry recovers", async ({ page }) => {
    let down = true;
    await page.route("**/localhost:8000/api/**", (route) => (down ? route.abort("connectionrefused") : route.continue()));
    await page.goto("/race/2020/1");
    await expect(page.getByRole("heading", { name: "Something went wrong" })).toBeVisible({ timeout: 10_000 });
    down = false;
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("heading", { name: /Austrian Grand Prix/i }).first()).toBeVisible();
  });

  test("slow API shows a skeleton, then the content", async ({ page }) => {
    await page.route("**/localhost:8000/api/seasons/2020/races/1", async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });
    await page.goto("/race/2020/1");
    await expect(page.locator('[role="status"]').first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Austrian Grand Prix/i }).first()).toBeVisible();
  });

  test("navigating quickly between races shows the last one requested", async ({ page }) => {
    await page.route("**/localhost:8000/api/seasons/2020/races/1", async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });
    await page.goto("/explore");
    await page.evaluate(() => {
      history.pushState({}, "", "/race/2020/1");
      dispatchEvent(new PopStateEvent("popstate"));
    });
    await page.evaluate(() => {
      history.pushState({}, "", "/race/2020/2");
      dispatchEvent(new PopStateEvent("popstate"));
    });
    await expect(page.getByRole("heading", { name: /Styrian Grand Prix/i }).first()).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(2000); // the slow first response must not overwrite the second page
    await expect(page.getByRole("heading", { name: /Styrian Grand Prix/i }).first()).toBeVisible();
  });
});

test.describe("drivers", () => {
  test("search, open a profile, see the season table, go back", async ({ page }) => {
    await page.goto("/drivers");
    await expect(page.locator('a[href^="/driver/"]')).toHaveCount(42);
    await page.getByLabel("Search drivers").fill("ham");
    await page.locator('a[href="/driver/HAM"]').click();
    await expect(page.getByRole("heading", { name: "Lewis Hamilton" })).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(7);
    await expect(page).toHaveTitle(/Lewis Hamilton/);
  });
});

test.describe("pages and assets", () => {
  for (const [path, title] of [
    ["/", /F1 for F1/],
    ["/explore", /Race calendar/],
    ["/simulation", /Strategy simulator/],
    ["/about_app", /About/],
  ] as const) {
    test(`${path} loads without JS errors and has a title`, async ({ page }) => {
      const errors = trackErrors(page);
      await page.goto(path);
      await expect(page).toHaveTitle(title);
      expect(errors).toEqual([]);
    });
  }

  test("no broken image is ever visible on the landing page (desktop and mobile)", async ({ page }) => {
    for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "networkidle" });
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 500) {
          scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 40));
        }
      });
      await page.waitForTimeout(1500); // let blocked third-party images actually fail
      const visibleBroken = await page.evaluate(() =>
        [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && getComputedStyle(i).display !== "none").length,
      );
      expect(visibleBroken).toBe(0);
    }
  });

  test("no horizontal scrolling on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ["/explore", "/race/2020/1", "/drivers", "/driver/VER", "/about_app"]) {
      await page.goto(path, { waitUntil: "networkidle" });
      await expect(page.locator('[role="status"]')).toHaveCount(0); // data has finished loading
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(1);
    }
  });
});
