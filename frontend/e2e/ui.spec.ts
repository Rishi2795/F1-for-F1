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
  test("the tyre strategy chart describes each driver's race in words", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/race/2025/6");
    const list = page.getByRole("list", { name: "Tyre strategy by driver, in finishing order" });
    await list.scrollIntoViewIfNeeded();
    await expect(list.getByRole("img", { name: /Oscar Piastri: Medium for \d+ laps, then Hard for \d+ laps/ })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("head to head: two chips pick two drivers, a third replaces the oldest, and a chip toggles off", async ({ page }) => {
    await page.goto("/race/2024/8");
    const pick = page.getByRole("group", { name: "Pick two drivers to compare" });
    await pick.scrollIntoViewIfNeeded();
    await expect(page.getByText("Choose two drivers above.")).toBeVisible();
    await pick.getByRole("button", { name: "LEC" }).click();
    await expect(page.getByText("Choose one more driver.")).toBeVisible();
    await pick.getByRole("button", { name: "VER" }).click();
    await expect(page.getByRole("term").filter({ hasText: "Finished" })).toBeVisible();
    await expect(page.getByText("Charles Leclerc").last()).toBeVisible();
    await pick.getByRole("button", { name: "NOR" }).click(); // replaces LEC, the oldest pick
    await expect(pick.getByRole("button", { name: "LEC" })).toHaveAttribute("aria-pressed", "false");
    await pick.getByRole("button", { name: "NOR" }).click(); // toggles off
    await expect(page.getByText("Choose one more driver.")).toBeVisible();
  });

  test("race header links to the previous and next race, and names the winner", async ({ page }) => {
    await page.goto("/race/2024/8");
    await expect(page.getByRole("link", { name: /Previous race: Emilia Romagna/ })).toBeVisible();
    await page.getByRole("link", { name: /Next race: Canadian/ }).click();
    await expect(page).toHaveURL(/\/race\/2024\/9$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Canadian");
    await expect(page.getByRole("link", { name: /winner/i })).toBeVisible();
  });

  test("every team in a race gets a card", async ({ page }) => {
    await page.goto("/race/2026/11");
    const teams = page.getByRole("list", { name: "Teams in this race" }).getByRole("listitem");
    await expect(teams.first()).toBeVisible();
    expect(await teams.count()).toBeGreaterThanOrEqual(10);
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
    await expect(page.locator("tbody tr")).toHaveCount(8); // 2019-2026
    await expect(page).toHaveTitle(/Lewis Hamilton/);
  });
});

test.describe("standings", () => {
  test("2024: official order and points, constructors tab, season switch", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/season/2024");
    await expect(page.getByRole("heading", { name: "2024 standings" })).toBeVisible();
    await expect(page).toHaveTitle(/2024 championship standings/);
    const first = page.locator("tbody tr").first();
    await expect(first).toContainText("Max Verstappen");
    await expect(first).toContainText("437");
    await expect(page.locator("tbody tr").nth(1)).toContainText("Lando Norris");
    await page.getByRole("tab", { name: "constructors" }).click();
    await expect(page.locator("tbody tr").first()).toContainText("McLaren");
    await expect(page.locator("tbody tr").first()).toContainText("666");
    await page.getByLabel("Season").selectOption("2023");
    await expect(page).toHaveURL(/\/season\/2023\?tab=constructors$/); // the tab is kept when switching season
    await expect(page.getByRole("heading", { name: "2023 standings" })).toBeVisible();
    await page.getByRole("tab", { name: "drivers" }).click();
    await expect(page.locator("tbody tr").first()).toContainText("575");
    expect(errors).toEqual([]);
  });

  test("tabs work with the arrow keys", async ({ page }) => {
    await page.goto("/season/2024");
    const drivers = page.getByRole("tab", { name: "drivers" });
    await drivers.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "constructors" })).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowLeft");
    await expect(drivers).toHaveAttribute("aria-selected", "true");
  });

  test("chart: 6 lines by default, lines can be toggled, hover shows exact points", async ({ page }) => {
    await page.goto("/season/2024");
    const chart = page.getByRole("img", { name: /Line chart of drivers championship points/ });
    await expect(chart).toBeVisible();
    await expect(chart.locator("polyline")).toHaveCount(6);
    const ham = page.getByRole("button", { name: "HAM", exact: true });
    await expect(ham).toHaveAttribute("aria-pressed", "false");
    await ham.click();
    await expect(ham).toHaveAttribute("aria-pressed", "true");
    await expect(chart.locator("polyline")).toHaveCount(7);
    await page.getByRole("button", { name: "VER", exact: true }).click();
    await expect(chart.locator("polyline")).toHaveCount(6);
    await chart.scrollIntoViewIfNeeded(); // the page is taller than the window; the mouse must land on the chart
    const box = await chart.boundingBox();
    await page.mouse.move(box!.x + box!.width * 0.98, box!.y + box!.height / 2);
    await expect(page.getByText(/R24 · Abu Dhabi GP/)).toBeVisible();
  });

  test("podium shows the top three; for teams the sub-line lists their drivers", async ({ page }) => {
    await page.goto("/season/2021");
    const podium = page.getByRole("list", { name: "Top three" });
    await expect(podium.getByRole("listitem")).toHaveCount(3);
    await expect(podium.getByRole("listitem").first()).toContainText("Max Verstappen"); // 2021 drivers' champion
    await expect(podium.getByRole("listitem").first()).toContainText("395.5");
    await page.getByRole("tab", { name: "constructors" }).click();
    await expect(podium.getByRole("listitem").first()).toContainText("Mercedes");
    await expect(podium.getByRole("listitem").first()).toContainText("HAM · BOT");
    await expect(podium.getByRole("listitem").first()).toContainText("613.5");
  });

  test("reduced motion: no entrance animations, points show their final value at once", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/season/2024");
    const first = page.getByRole("list", { name: "Top three" }).getByRole("listitem").first();
    // the visible (aria-hidden) digits equal the final value immediately, not a mid-count number
    await expect(first.locator('span[aria-hidden="true"]').filter({ hasText: /^437$/ })).toBeVisible({ timeout: 500 });
    const names = await page.evaluate(() => [...document.querySelectorAll(".f1-rise, .f1-drive")].map((el) => getComputedStyle(el).animationName));
    expect(names.length).toBeGreaterThan(0);
    expect(names.every((n) => n === "none")).toBe(true);
  });

  test("the header car artwork loads and is hidden from assistive tech", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/season/2024");
    const car = page.locator("img.f1-drive");
    await expect(car).toHaveAttribute("alt", "");
    await expect.poll(() => car.evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0)).toBe(true);
    await expect(car).toBeVisible();
  });

  test("gap view re-plots the same data as points behind the leader", async ({ page }) => {
    await page.goto("/season/2024");
    await page.getByRole("button", { name: "Gap to leader" }).click();
    await expect(page.getByRole("heading", { name: "Points behind the leader" })).toBeVisible();
    const chart = page.getByRole("img", { name: /Line chart of drivers championship points behind the leader/ });
    await expect(chart).toBeVisible();
    await expect(chart.getByText("Leader", { exact: true })).toBeVisible(); // the zero line is labelled
    await page.getByRole("button", { name: "Total points" }).click();
    await expect(page.getByRole("heading", { name: "Points after each round" })).toBeVisible();
  });

  test("on a phone the table keeps points and drops the secondary columns, with no sideways scroll", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/season/2024");
    await expect(page.getByRole("columnheader", { name: "Points" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "BEHIND_LEADER" })).toBeHidden();
    await expect(page.locator("tbody tr").first()).toContainText("437");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    // the chart is drawn at real size, not a shrunken desktop chart: its axis text is at least ~11px on screen
    const fontPx = await page.getByRole("img", { name: /Line chart/ }).locator("text").first().evaluate((el) => el.getBoundingClientRect().height);
    expect(fontPx).toBeGreaterThan(9);
  });

  test("/standings goes to the latest season; the dock highlights Standings", async ({ page }) => {
    await page.goto("/standings");
    await expect(page).toHaveURL(/\/season\/2026$/);
    await expect(page.getByRole("link", { name: "Standings", exact: true })).toHaveAttribute("aria-current", "page");
  });

  test("bad seasons explain themselves", async ({ page }) => {
    for (const path of ["/season/abc", "/season/1999", "/season/2017"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "We couldn't find that season" }), path).toBeVisible();
    }
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
    for (const path of ["/explore", "/race/2020/1", "/drivers", "/driver/VER", "/about_app", "/season/2024"]) {
      await page.goto(path, { waitUntil: "networkidle" });
      await expect(page.locator('[role="status"]')).toHaveCount(0); // data has finished loading
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(1);
    }
  });
});
