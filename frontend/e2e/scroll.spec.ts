import { expect, test } from "@playwright/test";

test.describe("scroll position", () => {
  test("a new page starts at the top, and so does coming back to one", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/drivers");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("main a[href^='/driver/']").last()).toBeVisible(); // the page is full length before we scroll it
    await page.evaluate(() => window.scrollTo(0, 1400));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(800);

    await page.locator("main a[href^='/driver/']").first().click({ force: true });
    await expect(page).toHaveURL(/\/driver\/[A-Z]{3}$/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

    await page.evaluate(() => window.scrollTo(0, 600));
    await page.goBack();
    await expect(page).toHaveURL(/\/drivers$/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0); // not where it was left
  });

  test("a link to a section of a page still scrolls to that section", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/forecast#accuracy");
    // the content above the section loads in stages and pushes it down, so wait for it to settle at the top rather than reading it once
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 15_000 }).toBeGreaterThan(300);
    await expect.poll(() => page.locator("#accuracy").evaluate((el) => el.getBoundingClientRect().top), { timeout: 10_000 }).toBeLessThan(400);
  });

  test("switching tabs or seasons on a page does not throw you back to the top", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/season/2024");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.getByRole("tab", { name: /constructors/i }).evaluate((el) => (el as HTMLElement).click()); // a script click: no scrolling of its own
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(200);
  });

  test("on a laptop the whole championship table fits one screen, without scrolling inside it", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto("/season/2026");
    const section = page.locator("section[aria-labelledby=table-h]");
    await expect(section.locator("tbody tr").first()).toBeVisible();
    const box = await section.evaluate((el) => ({ h: el.getBoundingClientRect().height, rows: el.querySelectorAll("tbody tr").length }));
    expect(box.rows).toBeGreaterThan(15);
    expect(box.h).toBeLessThanOrEqual(800);
  });

  for (const [w, h] of [[360, 740], [768, 1024], [1024, 768]] as const) {
    test(`no page scrolls sideways at ${w} wide`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      for (const path of ["/", "/pitwall", "/methodology", "/news", "/schedule", "/season/2026", "/simulation", "/ratings"]) {
        await page.goto(path, { waitUntil: "load" });
        await page.waitForTimeout(500);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${path} at ${w}px`).toBeLessThanOrEqual(0);
      }
    });
  }

  test("home: every section is one screen, the page snaps between them, and the dots jump to a section", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.locator("[data-scene]").first()).toBeVisible();
    const scenes = page.locator("[data-scene]");
    expect(await scenes.count()).toBeGreaterThanOrEqual(7);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType)).toMatch(/y/);

    for (let i = 0; i < (await scenes.count()); i++) {
      await scenes.nth(i).evaluate((el) => { let t = 0; for (let e: HTMLElement | null = el as HTMLElement; e; e = e.offsetParent as HTMLElement | null) t += e.offsetTop; window.scrollTo(0, t); });
      await page.waitForTimeout(1300); // the scene eases in (scale and fade) before it is measured
      const box = await scenes.nth(i).evaluate((el) => ({ top: el.getBoundingClientRect().top, clipped: el.hasAttribute("data-hero") ? 0 : el.scrollHeight - el.clientHeight }));
      expect(Math.abs(box.top), `scene ${i} lines up with the top`).toBeLessThan(3);
      expect(box.clipped, `scene ${i} shows all of its content`).toBeLessThanOrEqual(1);
    }

    await page.evaluate(() => window.scrollTo(0, 0));
    const dots = page.getByRole("navigation", { name: "Sections of the home page" });
    await expect(dots.getByRole("button")).toHaveCount(await scenes.count());
    await dots.getByRole("button", { name: "Tech history" }).click();
    await expect.poll(() => scenes.filter({ hasText: /TECH_/ }).evaluate((el) => Math.abs(el.getBoundingClientRect().top)), { timeout: 8000 }).toBeLessThan(5);
  });

  test("home on a phone: every scene is exactly one screen, it snaps, and the dots are there", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const scenes = page.locator("[data-scene]");
    await expect(scenes.first()).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType)).toMatch(/y/);
    for (let i = 0; i < (await scenes.count()); i++) {
      await scenes.nth(i).evaluate((el) => { let t = 0; for (let e: HTMLElement | null = el as HTMLElement; e; e = e.offsetParent as HTMLElement | null) t += e.offsetTop; window.scrollTo(0, t); });
      await page.waitForTimeout(1300);
      const box = await scenes.nth(i).evaluate((el) => ({ top: el.getBoundingClientRect().top, h: el.getBoundingClientRect().height, clipped: el.scrollHeight - el.clientHeight }));
      expect(Math.abs(box.top), `scene ${i} lines up with the top`).toBeLessThan(3);
      expect(box.h, `scene ${i} is one screen`).toBeLessThanOrEqual(845);
      expect(box.clipped, `scene ${i} shows all of its content`).toBeLessThanOrEqual(1);
    }
    await expect(page.getByRole("navigation", { name: "Sections of the home page" })).toBeVisible();
  });

  test("schedule: the next race is a full-screen scene", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto("/schedule");
    const scene = page.locator("#next-scene");
    await expect(scene).toBeVisible();
    const h = await scene.evaluate((el) => el.getBoundingClientRect().height);
    expect(h).toBeGreaterThan(700);
    expect(h).toBeLessThanOrEqual(800);
  });
});
