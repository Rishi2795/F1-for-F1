import { expect, test } from "@playwright/test";

test.describe("world champions", () => {
  test("profile and list show titles; a finished season's leader is crowned, a running one is not", async ({ page }) => {
    await page.goto("/driver/HAM");
    await expect(page.getByLabel(/World Champion ×7 \(2008, 2014, 2015, 2017, 2018, 2019, 2020\)/)).toBeVisible();

    await page.goto("/drivers");
    await expect(page.locator('a[href="/driver/VER"]').getByLabel(/World Champion ×4/)).toBeVisible();
    await expect(page.locator('a[href="/driver/PER"]').getByLabel(/World Champion/)).toHaveCount(0);

    await page.goto("/season/2024"); // finished
    await expect(page.getByRole("list", { name: "Top three" }).getByRole("listitem").first()).toContainText("World Champion");
    await page.getByRole("tab", { name: "constructors" }).click();
    await expect(page.getByRole("list", { name: "Top three" }).getByRole("listitem").first()).toContainText("Constructors' Champion");

    await page.goto("/season/2026"); // still running: the leader is not a champion yet
    await expect(page.getByRole("list", { name: "Top three" }).getByRole("listitem").first()).not.toContainText("Champion");
  });
});

test.describe("standings: round slider and shareable links", () => {
  test("scrubbing back in time changes everything and lives in the URL", async ({ page }) => {
    await page.goto("/season/2024");
    const podium = page.getByRole("list", { name: "Top three" }).getByRole("listitem").first();
    await expect(podium).toContainText("437");
    await page.locator("#round").fill("12");
    await expect(page).toHaveURL(/round=12/);
    await expect(page.locator("label[for=round]")).toContainText("Standings after round 12");
    await expect(podium).toContainText("255");
    await expect(podium).not.toContainText("World Champion"); // only the final round is a champion
    await page.getByRole("button", { name: "Back to the latest round" }).click();
    await expect(page).not.toHaveURL(/round=/);
    await expect(podium).toContainText("437");
  });

  test("a pasted link restores tab, chart view, round and chosen lines", async ({ page }) => {
    await page.goto("/season/2024?tab=constructors&view=gap&round=12&lines=Williams");
    await expect(page.getByRole("tab", { name: "constructors" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("heading", { name: "Points behind the leader" })).toBeVisible();
    await expect(page.locator("#round")).toHaveValue("12");
    await expect(page.getByRole("button", { name: "Williams", exact: true })).toHaveAttribute("aria-pressed", "true"); // flipped on
  });

  test("changing season keeps the tab and view but drops the round", async ({ page }) => {
    await page.goto("/season/2024?tab=constructors&view=gap&round=12");
    await page.getByLabel("Season").selectOption("2023");
    await expect(page).toHaveURL(/\/season\/2023\?tab=constructors&view=gap$/);
  });
});

test.describe("copy link", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });
  test("copies the current view's address", async ({ page }) => {
    await page.goto("/season/2024?view=gap");
    await page.getByRole("button", { name: "Copy link to this view" }).click();
    await expect(page.getByRole("button", { name: "Link copied" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("/season/2024?view=gap");
  });
});

test.describe("free-hosting experience", () => {
  test("a request stuck for over 3 seconds explains the wait, then the notice goes away", async ({ page }) => {
    await page.route("**/localhost:8000/api/seasons/2024/standings", async (route) => {
      await new Promise((r) => setTimeout(r, 4200));
      await route.continue();
    });
    await page.goto("/season/2024");
    const notice = page.getByRole("status").filter({ hasText: "Waking the server" });
    await expect(notice).toBeVisible({ timeout: 6000 });
    await expect(notice).toBeHidden({ timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "2024 standings" })).toBeVisible();
  });

  test("fast responses never show the notice", async ({ page }) => {
    await page.goto("/explore");
    await expect(page.getByRole("status").filter({ hasText: "Waking the server" })).toHaveCount(0);
  });
});

test.describe("keyboard and landmarks", () => {
  test("the bottom dock stays visible while a keyboard user is in it", async ({ page }) => {
    await page.goto("/explore");
    const nav = page.getByRole("navigation", { name: "Main" });
    await page.getByRole("link", { name: "Standings", exact: true }).focus();
    await page.waitForTimeout(4200); // longer than the idle fade-out
    await expect(nav).toHaveCSS("opacity", "1");
  });

  test("the dock marks the current page for assistive tech", async ({ page }) => {
    await page.goto("/season/2024");
    await expect(page.getByRole("link", { name: "Standings", exact: true })).toHaveAttribute("aria-current", "page");
  });

  test("first Tab reaches a skip link that jumps to the content; there is exactly one main landmark", async ({ page }) => {
    for (const path of ["/explore", "/race/2024/8", "/season/2024", "/methodology"]) {
      await page.goto(path);
      await expect(page.locator("main"), path).toHaveCount(1);
    }
    await page.goto("/explore");
    await page.keyboard.press("Tab"); // pressed straight after navigation: the layout must already be mounted
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
  });
});

test.describe("footer, methodology and race story", () => {
  test("every page has credits and a disclaimer; the methodology page shows live coverage", async ({ page }) => {
    await page.goto("/explore");
    const footer = page.getByRole("contentinfo");
    await expect(footer).toContainText("Not affiliated with, or endorsed by, Formula 1");
    for (const name of ["Jolpica-F1", "TracingInsights", "OpenF1"]) await expect(footer.getByRole("link", { name })).toBeVisible();
    await footer.getByRole("link", { name: "Methodology and data coverage" }).click();
    await expect(page).toHaveURL(/\/methodology$/);
    await expect(page.getByRole("heading", { name: "How the numbers are made" })).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(7); // 2020-2026
    await expect(page.getByRole("link", { name: "2022 Monaco Grand Prix" })).toBeVisible(); // a known partial race
    await expect(page.getByText(/Data last built/).first()).toBeVisible();
  });

  test("the race page tells how this race actually went, from its own data", async ({ page }) => {
    await page.goto("/race/2024/8");
    await expect(page.getByText("Won by Charles Leclerc (Ferrari)")).toBeVisible();
    await expect(page.getByText("The race was red-flagged.")).toBeVisible();
    await expect(page.getByText(/laps? run behind the safety car/)).toBeVisible();
    await expect(page.getByText("High-speed aero stability and thermal management")).toHaveCount(0); // the old filler line
  });

  test("race page has no placeholder jargon left", async ({ page }) => {
    await page.goto("/race/2024/8");
    const text = await page.locator("main").innerText();
    for (const jargon of ["SYS_ACTIVE", "CIRCUIT_ARCHITECTURE", "Alpha_Pilot", "Selection_Sync", "Unit_Efficiency"]) {
      expect(text, jargon).not.toContain(jargon);
    }
  });
});
