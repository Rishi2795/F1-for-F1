import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** Automated accessibility scan (WCAG 2 A/AA). Only serious and critical findings fail the build.
 *  Animations are switched off so colours are measured at rest, not mid-fade. */
const PAGES = [
  "/explore",
  "/race/2024/8",
  "/race/2021/12",
  "/drivers",
  "/driver/VER",
  "/season/2024",
  "/season/2021?tab=constructors",
  "/methodology",
  "/definitely-not-a-page",
];

for (const path of PAGES) {
  test(`no serious accessibility violations: ${path}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(path, { waitUntil: "networkidle" });
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    const summary = serious.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} element(s), e.g. ${v.nodes[0]?.target.join(" ")}`);
    expect(summary, summary.join("\n")).toEqual([]);
  });
}
