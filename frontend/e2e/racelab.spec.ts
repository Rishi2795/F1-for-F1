import { expect, test } from "@playwright/test";

/** The race lab on the 2026 British GP, which has real-position replay data, telemetry and race-control messages. */
test.describe("race lab replay", () => {
  test("shows real positions, lets you pick up to two drivers, and clears the selection", async ({ page }) => {
    await page.goto("/race/2026/9/lab");
    await expect(page.getByText("REAL POSITIONS")).toBeVisible();
    const order = page.getByRole("list", { name: /Running order/ });
    for (const code of ["HAM", "LEC", "RUS"]) await order.getByRole("button", { name: code }).click();
    await expect(order.getByRole("button", { name: "HAM" })).toHaveAttribute("aria-pressed", "false"); // the oldest pick drops off
    await expect(order.getByRole("button", { name: "LEC" })).toHaveAttribute("aria-pressed", "true");
    await expect(order.getByRole("button", { name: "RUS" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "SHOW ALL" }).click();
    await expect(order.getByRole("button", { name: "LEC" })).toHaveAttribute("aria-pressed", "false");
  });

  test("zoom and auto-zoom work with buttons", async ({ page }) => {
    await page.goto("/race/2026/9/lab");
    const zoom = page.getByRole("group", { name: "Zoom the map" }).first();
    await zoom.getByRole("button", { name: "Zoom in" }).click();
    await expect(zoom.getByText(/^1\.[5-9]×$/)).toBeVisible();
    await zoom.getByRole("button", { name: "Reset the view" }).click();
    await expect(zoom.getByText("1.0×")).toBeVisible();
    const pack = page.getByRole("button", { name: /AUTO-ZOOM PACK|FOLLOWING PACK/ });
    await pack.click();
    await expect(pack).toHaveAttribute("aria-pressed", "true");
    await pack.click();
    await expect(pack).toHaveAttribute("aria-pressed", "false");
  });

  test("the event feed lists pit stops and retirements and jumps the replay to one", async ({ page }) => {
    await page.goto("/race/2026/9/lab");
    const feed = page.getByRole("list", { name: "Race events" });
    await expect(feed).toBeVisible();
    await page.getByRole("button", { name: "OUT", exact: true }).click();
    await expect(feed.getByRole("button", { name: /VER out on lap 47/ })).toBeVisible();
    const before = await page.getByRole("slider", { name: "Race time" }).inputValue();
    await feed.getByRole("button", { name: /VER out on lap 47/ }).click();
    await expect(page.getByRole("slider", { name: "Race time" })).not.toHaveValue(before);
    await page.getByRole("button", { name: "PITS", exact: true }).click();
    expect(await feed.getByRole("listitem").count()).toBeGreaterThan(10);
  });

  test("picking a driver filters the event feed to them", async ({ page }) => {
    await page.goto("/race/2026/9/lab");
    await page.getByRole("list", { name: /Running order/ }).getByRole("button", { name: "VER" }).click();
    const items = page.getByRole("list", { name: "Race events" }).getByRole("listitem");
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) await expect(items.nth(i)).toContainText(/VER/);
  });
});

test.describe("fastest-lap telemetry", () => {
  test("the trace can be moved with the keyboard and the readings follow", async ({ page }) => {
    await page.goto("/race/2026/9/lab");
    const trace = page.getByRole("slider", { name: /round the lap/ });
    await trace.scrollIntoViewIfNeeded();
    await trace.focus();
    await page.keyboard.press("Home");
    await expect(page.getByText("0:00.000").first()).toBeVisible();
    await page.keyboard.press("Shift+ArrowRight");
    await expect(trace).toHaveAttribute("aria-valuenow", "10");
    await expect(page.getByText("0:00.000")).toHaveCount(0);
  });

  test("choosing a driver and a rival shows the time gap", async ({ page }) => {
    await page.goto("/race/2026/9/lab");
    await page.getByLabel("Compare with").selectOption("VER");
    await expect(page.getByText(/vs VER here/)).toBeVisible();
  });
});

test.describe("older races", () => {
  test("a race without real-position data says its positions are estimated", async ({ page }) => {
    await page.goto("/race/2024/8/lab");
    await expect(page.getByText("ESTIMATED POSITIONS")).toBeVisible();
    await expect(page.getByRole("list", { name: "Race events" })).toBeVisible(); // pits, passes and retirements still work
  });
});
