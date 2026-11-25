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

test.describe("standings: pick a round on the chart, shareable links", () => {
  test("clicking a round on the chart changes everything and lives in the URL", async ({ page }) => {
    await page.goto("/season/2024");
    const podium = page.getByRole("list", { name: "Top three" }).getByRole("listitem").first();
    await expect(podium).toContainText("437");
    await expect(page.locator("#round")).toHaveCount(0); // no slider: the chart is the control
    const chart = page.getByRole("img", { name: /Line chart of drivers/ });
    await chart.focus(); // keyboard path: highlight a round with the arrows, Enter selects it
    await page.locator("div[tabindex='0']").filter({ has: chart }).focus();
    for (let i = 0; i < 12; i++) await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/round=12/);
    await expect(page.getByText(/Standings after round 12|After round 12/).first()).toBeVisible();
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
    await expect(page.getByText(/After round 12/).first()).toBeVisible();
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
    await expect(page.getByRole("table", { name: /Races by completeness/ }).locator("tbody tr")).toHaveCount(8); // 2019-2026
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

test.describe("driver and car ratings", () => {
  test("leaderboard ranks the grid and links to profiles", async ({ page }) => {
    await page.goto("/ratings");
    await expect(page.getByRole("heading", { name: "Driver or car?" })).toBeVisible();
    const rows = page.getByRole("table").getByRole("row");
    await expect(rows.nth(11)).toBeVisible(); // header + more than ten drivers, once loaded
    await expect(rows.nth(1).getByRole("cell").first()).toHaveText("1");
    await rows.nth(1).getByRole("link").click();
    await expect(page).toHaveURL(/\/driver\/[A-Z]{3}$/);
  });

  test("the map places every driver, and the ranking can be re-sorted", async ({ page }) => {
    await page.goto("/ratings");
    const map = page.getByRole("list", { name: "Drivers placed by car strength and driver skill" });
    await expect(map.getByRole("link")).toHaveCount(25);
    await expect(map.getByRole("link", { name: /VER: Max Verstappen.*best driver.*best car/ })).toBeVisible();
    await expect(page.getByText(/1500|Elo/)).toHaveCount(0); // no raw scores shown to readers
    const best = page.getByRole("group", { name: "Sort the ranking" });
    await best.getByRole("button", { name: "Best cars" }).click();
    await expect(best.getByRole("button", { name: "Best cars" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("table").getByRole("row").nth(1)).toContainText(/1st/); // top row has the best car
  });

  test("profile says where the driver and the car rank, in words", async ({ page }) => {
    await page.goto("/driver/VER");
    const panel = page.getByRole("region", { name: /driver_and_car_rating/i });
    await expect(panel.getByText("AS_A_DRIVER", { exact: true })).toBeVisible();
    await expect(panel.getByText(/of \d+ rated drivers/)).toBeVisible();
    await expect(panel.getByText(/best of \d+ cars/)).toBeVisible();
    await expect(panel.getByText(/Beats the car|Matches the car|Carried by the car/)).toBeVisible();
    await expect(panel.getByRole("img", { name: /how good the driver and the car were/i })).toBeVisible();
  });

  test("methodology states how accurate the model is, honestly", async ({ page }) => {
    await page.goto("/methodology#ratings");
    const section = page.getByRole("region", { name: "The ratings model" });
    await expect(section.getByRole("table", { name: /Prediction accuracy/ })).toBeVisible();
    await expect(section.getByText(/Honest reading|Ratings improve/)).toBeVisible();
    await expect(section.getByRole("table", { name: /Predicted versus observed/ })).toBeVisible();
  });
});

test.describe("race detail", () => {
  test("a modern race shows highlights, classification, lap chart, pace and pit stops", async ({ page }) => {
    await page.goto("/race/2024/8");
    const detail = page.locator("main");
    await expect(detail.getByText("FASTEST_LAP").first()).toBeVisible();
    await expect(detail.getByRole("table", { name: "Race classification" })).toBeVisible();
    await expect(detail.getByRole("img", { name: /Lap chart: position after each of \d+ laps/ })).toBeVisible();
    const pace = detail.getByRole("group", { name: "Race pace by driver, quickest first" });
    await expect(pace.getByRole("button")).toHaveCount(16);
    await pace.getByRole("button").nth(3).hover();
    await expect(detail.getByText(/rank 4 of 16/)).toBeVisible();
    await expect(detail.getByRole("list", { name: "Tyre strategy by driver, in finishing order" }).getByRole("img").first()).toBeVisible();
    await expect(detail.getByRole("table")).toHaveCount(1); // one main table: the classification
  });

  test("following a driver in the lap chart is a toggle", async ({ page }) => {
    await page.goto("/race/2024/8");
    const ver = page.getByRole("group", { name: "Follow a driver" }).getByRole("button", { name: "VER" });
    await ver.click();
    await expect(ver).toHaveAttribute("aria-pressed", "true");
    await ver.click();
    await expect(ver).toHaveAttribute("aria-pressed", "false");
  });

  test("a race without lap data still shows the classification and never invents the rest", async ({ page }) => {
    await page.goto("/race/2021/12");
    const detail = page.locator("main");
    await expect(detail.getByRole("table", { name: "Race classification" })).toBeVisible();
  });
});

test.describe("phone layout", () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test("the dock fits the screen and no page scrolls sideways", async ({ page }) => {
    for (const path of ["/methodology", "/race/2024/8", "/ratings", "/season/2024", "/drivers", "/driver/VER"]) {
      await page.goto(path, { waitUntil: "networkidle" });
      const box = await page.getByRole("navigation", { name: "Main" }).boundingBox();
      expect(box, `${path}: dock`).not.toBeNull();
      expect(box!.x, `${path}: dock left edge`).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width, `${path}: dock right edge`).toBeLessThanOrEqual(390);
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(width, `${path}: page width`).toBeLessThanOrEqual(390);
    }
  });
});

test.describe("forecast", () => {
  test("names a favourite for each race to come, and explains the odds", async ({ page }) => {
    await page.goto("/forecast");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Who wins next?");
    const race = page.getByRole("region", { name: /Chances for the .* Grand Prix/ });
    await expect(race.getByRole("row")).toHaveCount(11); // header + the top ten
    await expect(page.getByText(/is the favourite at \d+%/)).toBeVisible();
    await page.getByRole("button", { name: /SHOW_ALL_/ }).first().click();
    expect(await race.getByRole("row").count()).toBeGreaterThan(15);
    await page.getByRole("group", { name: "Choose a race" }).getByRole("button").nth(1).click();
    await expect(page.getByText(/ABU_DHABI_GRAND_PRIX/)).toBeVisible();
  });

  test("says plainly when a title is already decided, and switches to constructors", async ({ page }) => {
    await page.goto("/forecast");
    await expect(page.getByText("TITLE_DECIDED").first()).toBeVisible();
    await expect(page.getByText(/is the 2026 champion/)).toBeVisible();
    await page.getByRole("group", { name: "Which championship" }).getByRole("button", { name: "constructors" }).click();
    await expect(page.getByText(/constructors' champions/)).toBeVisible();
  });

  test("shows its misses and how accurate it has been", async ({ page }) => {
    await page.goto("/forecast#accuracy");
    await expect(page.getByText(/MISSED_RANKED_\d/).first()).toBeVisible();
    await expect(page.getByText("BEFORE_QUALIFYING")).toBeVisible();
    await expect(page.getByText("WHAT_IT_CANNOT_DO")).toBeVisible();
    await expect(page.getByText(/Random guess/).first()).toBeVisible();
  });
});

test.describe("pit wall tools", () => {
  test("the hub lists every tool as a question and opens them", async ({ page }) => {
    await page.goto("/pitwall");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("pit wall");
    await expect(page.getByRole("link", { name: /Forecast/ }).first()).toBeVisible();
    await expect(page.getByText("Was that race worth a replay? Spoiler-free.")).toBeVisible();
    await page.getByRole("link", { name: /Worth watching/ }).click();
    await expect(page).toHaveURL(/\/watch$/);
  });

  test("worth watching hides winners until asked, and re-orders", async ({ page }) => {
    await page.goto("/watch");
    const list = page.getByRole("list", { name: /most exciting first/ });
    await expect(list.getByRole("listitem").first()).toBeVisible();
    expect(await list.getByRole("listitem").count()).toBeGreaterThan(10);
    await expect(page.getByText(/WON_BY_/)).toHaveCount(0);
    await page.getByRole("button", { name: "SHOW_WINNERS" }).click();
    await expect(page.getByText(/WON_BY_/).first()).toBeVisible();
    await page.getByRole("button", { name: "CALENDAR" }).click();
    await expect(page.getByRole("list", { name: /in calendar order/ })).toBeVisible();
    await page.getByRole("group", { name: "Season" }).getByRole("button", { name: "2024" }).click();
    await expect(page.getByRole("list", { name: /Races of 2024/ })).toBeVisible();
  });

  test("teammate duels compare qualifying, race result and pace", async ({ page }) => {
    await page.goto("/duels");
    await page.getByRole("group", { name: "Season" }).getByRole("button", { name: "2024" }).click();
    const norris = page.getByRole("article").filter({ hasText: "Lando Norris" });
    await expect(norris.getByRole("img", { name: /QUALIFYING: NOR 20, PIA 4/ })).toBeVisible();
    await expect(norris.getByText("RACE_PACE")).toBeVisible();
    await expect(norris.getByText(/had the edge|quicker over one lap/)).toBeVisible();
  });

  test("circuits: search, then a profile with what to expect", async ({ page }) => {
    await page.goto("/circuits");
    await page.getByLabel("FIND_A_CIRCUIT").fill("monaco");
    await page.getByRole("link", { name: /Monte Carlo/ }).click();
    await expect(page).toHaveURL(/\/circuit\/monte-carlo$/);
    await expect(page.getByText("POLE_TO_WIN")).toBeVisible();
    await expect(page.getByRole("region", { name: /Past races at Monte Carlo/ })).toBeVisible();
  });

  test("a race links to its circuit and shows how eventful it was", async ({ page }) => {
    await page.goto("/race/2024/8");
    await expect(page.getByText("WORTH_WATCHING")).toBeVisible();
    await page.getByRole("link", { name: /TRACK_HISTORY/ }).click();
    await expect(page).toHaveURL(/\/circuit\/monte-carlo$/);
  });

  test("qualifying ladder and sprint results are on the race page", async ({ page }) => {
    await page.goto("/race/2024/5"); // a sprint weekend
    await expect(page.getByRole("list", { name: "Qualifying order and gap to pole" })).toBeVisible();
    await expect(page.getByText("SPRINT_RESULT // TOP_8")).toBeVisible();
  });

  test("the tyre model prices alternative strategies for each driver", async ({ page }) => {
    await page.goto("/race/2024/10");
    await expect(page.getByText("WHAT_THE_TYRES_DID")).toBeVisible();
    await expect(page.getByText("FUEL_BURN")).toBeVisible();
    const pick = page.getByRole("group", { name: "Choose a driver" }).first();
    await pick.getByRole("button").nth(2).click();
    await expect(page.getByText(/ran .*\./).first()).toBeVisible();
    await expect(page.getByText(/tyre cost only/)).toBeVisible();
  });
});

test.describe("forecast tools", () => {
  test("title maths explains what a driver needs", async ({ page }) => {
    await page.goto("/forecast");
    const tool = page.locator("div", { has: page.getByText("WHAT_DOES_THIS_DRIVER_NEED?") }).last();
    await tool.getByRole("button", { name: "VER" }).click();
    await expect(tool.getByText(/out of title contention|points behind/)).toBeVisible();
    await tool.getByRole("button", { name: "ANT" }).click();
    await expect(tool.getByText(/cannot be caught/)).toBeVisible();
  });

  test("beat the model: lock in a podium and it is remembered", async ({ page }) => {
    await page.goto("/play");
    const pick = page.getByRole("group", { name: "Pick three drivers in finishing order" });
    for (const code of ["VER", "ANT", "NOR"]) await pick.getByRole("button", { name: new RegExp(code) }).click();
    await page.getByRole("button", { name: "LOCK_IN_PODIUM" }).click();
    await expect(page.getByText(/Locked in for the/)).toBeVisible();
    await page.reload();
    await expect(page.getByText(/Locked in for the/)).toBeVisible();
    await expect(page.getByText("AWAITING_RESULT")).toBeVisible();
    await page.getByRole("button", { name: "CHANGE_MY_PICK" }).click();
    await expect(page.getByRole("button", { name: "LOCK_IN_PODIUM" })).toBeDisabled();
  });

  test("my driver: the choice survives a reload and shows chances", async ({ page }) => {
    await page.goto("/my");
    await page.getByRole("group", { name: "Choose your driver" }).getByRole("button", { name: "Verstappen" }).click();
    await expect(page.getByRole("region", { name: "Briefing for Max Verstappen" })).toBeVisible();
    await page.reload();
    const brief = page.getByRole("region", { name: "Briefing for Max Verstappen" });
    await expect(brief.getByText("AS_A_DRIVER")).toBeVisible();
    await expect(brief.getByText(/in qualifying and/)).toBeVisible();
  });
});

test.describe("everywhere", () => {
  test("Ctrl+K searches drivers, races and circuits", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
    await page.keyboard.press("Control+k");
    const box = page.getByRole("combobox");
    await expect(box).toBeFocused();
    await box.fill("monza");
    await page.getByRole("option", { name: /Monza/ }).first().click();
    await expect(page).toHaveURL(/\/circuit\/monza$/);
    await page.keyboard.press("Control+k");
    await page.getByRole("combobox").fill("hamilton");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/driver\/HAM$/);
  });

  test("standings show who moved since the last round", async ({ page }) => {
    await page.goto("/season/2024");
    await expect(page.getByLabel(/(up|down) \d+ since the last round/).first()).toBeVisible();
  });

  test("drivers can be narrowed to champions and to the current grid", async ({ page }) => {
    await page.goto("/drivers");
    await expect(page.locator('a[href^="/driver/"]')).toHaveCount(42);
    const all = 42;
    await page.getByRole("button", { name: "CHAMPIONS" }).click();
    const champs = await page.locator('a[href^="/driver/"]').count();
    expect(champs).toBeGreaterThan(0);
    expect(champs).toBeLessThan(all);
    await page.getByRole("button", { name: "ON_THE_GRID" }).click();
    expect(await page.locator('a[href^="/driver/"]').count()).toBeLessThan(all);
  });

  test("the race list shows how watchable each race was", async ({ page }) => {
    await page.goto("/explore");
    await expect(page.getByText(/WATCH \d\.\d/).first()).toBeVisible();
  });

  test("a driver on this season's grid sees their weekend and teammate numbers", async ({ page }) => {
    await page.goto("/driver/VER");
    await expect(page.getByText("THIS_WEEKEND_AND_SEASON")).toBeVisible();
    await expect(page.getByText("VS_TEAMMATE")).toBeVisible();
  });
});

test.describe("new pages on a phone", () => {
  test.use({ viewport: { width: 390, height: 800 } });
  test("nothing scrolls sideways", async ({ page }) => {
    for (const path of ["/pitwall", "/team-pace", "/race/2024/8/lab", "/watch", "/duels", "/circuits", "/circuit/monte-carlo", "/play", "/my", "/forecast", "/race/2024/10"]) {
      await page.goto(path, { waitUntil: "networkidle" });
      expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(390);
    }
  });
});

test.describe("race lab and team pace", () => {
  test("the race lab replays the order, charts the gaps and compares two drivers", async ({ page }) => {
    await page.goto("/race/2024/8");
    await page.getByRole("link", { name: /OPEN_RACE_LAB/ }).click();
    await expect(page).toHaveURL(/\/race\/2024\/8\/lab$/);
    await expect(page.getByRole("img", { name: /Track map replay at lap \d+/ })).toBeVisible();
    const order = page.getByRole("list", { name: /Running order at lap \d+/ });
    await expect(order.getByRole("listitem").first()).toBeVisible();
    await page.getByLabel("Race time").fill("4200");
    await expect(page.getByRole("list", { name: /Running order at lap (2\d|3\d)/ })).toBeVisible();
    await expect(page.getByRole("img", { name: /Gap to the leader over 78 laps/ })).toBeVisible();
    await expect(page.getByRole("list", { name: "Pace distribution, quickest median first" }).getByRole("listitem").first()).toBeVisible();
    await expect(page.getByRole("img", { name: /Median lap time of the field/ })).toBeVisible();
    await page.getByRole("group", { name: "Pick two drivers" }).getByRole("button", { name: "VER" }).click();
    await expect(page.getByText(/comparable laps/)).toBeVisible();
    await expect(page.getByText("NEUTRALISED_LAPS")).toBeVisible();
    await expect(page.getByText("UNDERCUT_TRACKER")).toBeVisible();
  });

  test("the replay can be played and paused", async ({ page }) => {
    await page.goto("/race/2024/8/lab");
    await page.getByRole("button", { name: "PLAY" }).click();
    await expect(page.getByRole("button", { name: "PAUSE" })).toBeVisible();
    await expect(page.getByText(/LAP_([2-9]|\d\d)_OF_78/)).toBeVisible();
    await page.getByRole("button", { name: "PAUSE" }).click();
    await expect(page.getByRole("button", { name: "PLAY" })).toBeVisible();
  });

  test("a race without lap data says so plainly", async ({ page }) => {
    await page.goto("/race/2021/12/lab");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("lab");
  });

  test("team pace ranks the cars and says who is improving", async ({ page }) => {
    await page.goto("/team-pace");
    await expect(page.getByRole("img", { name: /Race pace gap to the quickest car for \d+ teams/ })).toBeVisible();
    const table = page.getByRole("region", { name: /team pace, quickest first/i });
    await expect(table.getByText("Mercedes")).toBeVisible();
    await expect(table.getByText(/IMPROVING|FADING|STEADY/).first()).toBeVisible();
    await page.getByRole("group", { name: "Season" }).getByRole("button", { name: "2024" }).click();
    await expect(page.getByRole("img", { name: /for \d+ teams over \d+ rounds in 2024/ })).toBeVisible();
  });
});

test.describe("map replay and analysis", () => {
  test("where it went wrong: pick a driver, read the moments, jump to one on the map", async ({ page }) => {
    await page.goto("/race/2024/8/lab");
    await page.getByRole("group", { name: "Choose a driver to analyse" }).getByRole("button", { name: "VER" }).click();
    await expect(page.getByText(/Max Verstappen started P\d+ and finished P\d+/)).toBeVisible();
    await expect(page.getByText("WHAT_TO_LOOK_AT")).toBeVisible();
    const slider = page.getByLabel("Race time");
    const before = await slider.inputValue();
    await page.getByRole("button", { name: /WATCH_ON_MAP/ }).first().click();
    await expect.poll(async () => await slider.inputValue()).not.toBe(before);
  });

  test("cars can be coloured by tyre and followed", async ({ page }) => {
    await page.goto("/race/2024/8/lab");
    await page.getByRole("group", { name: "Colour cars by" }).getByRole("button", { name: "TYRE" }).click();
    await expect(page.getByRole("group", { name: "Colour cars by" }).getByRole("button", { name: "TYRE" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("group", { name: "Replay speed" }).getByRole("button", { name: "240×" }).click();
    await page.getByRole("list", { name: /Running order at lap/ }).getByRole("button", { name: "VER" }).click();
  });

  test("a circuit with no position data falls back to the lap-by-lap replay", async ({ page }) => {
    await page.goto("/race/2019/11/lab"); // Hockenheim has not hosted a race since the position data begins
    await expect(page.getByRole("list", { name: /Running order after lap/ })).toBeVisible();
  });

  test("circuit pages draw the track from a real lap; the list shows thumbnails", async ({ page }) => {
    await page.goto("/circuit/monte-carlo");
    await expect(page.getByRole("img", { name: /Outline of Monte Carlo, \d\.\d+ kilometres/ })).toBeVisible();
    await expect(page.getByText(/DRAWN_FROM/)).toBeVisible();
    await page.goto("/circuits");
    await expect(page.getByRole("link", { name: /Monza/ })).toBeVisible();
    expect(await page.locator('a[href^="/circuit/"] svg').count()).toBeGreaterThan(15);
  });
});
