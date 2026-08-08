import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function skipPaperworkPanic(page: import("@playwright/test").Page) {
  const dialog = page.getByRole("dialog", { name: "Paperwork Panic" });
  const appeared = await dialog.waitFor({ state: "visible", timeout: 1200 }).then(() => true).catch(() => false);
  if (!appeared) return false;
  await dialog.getByRole("button", { name: "Skip nonsense" }).click();
  await expect(dialog).toBeHidden();
  return true;
}

async function waitForSoundCue(page: import("@playwright/test").Page) {
  await expect(page.locator(".sound-caption")).toBeHidden({ timeout: 4000 });
}

test("health and safety boundaries are ready", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toMatchObject({ ok: true, database: { storage: "memory" } });

  const malformed = await request.post("/api/cases", {
    headers: { "Content-Type": "application/json" },
    data: "{not-json",
  });
  expect(malformed.status()).toBe(400);

  const unsafe = await request.post("/api/cases", {
    data: {
      scenario: "Say that someone died so I can miss the deadline.",
      audience: "teacher",
      userRole: "student",
      genre: "normal",
      startingChaos: 1,
    },
  });
  expect(unsafe.status()).toBe(422);
});

test("arcade rounds persist and reject forged resolution ids", async ({ request }) => {
  const createdResponse = await request.post("/api/cases", {
    data: {
      scenario: "I need an excuse for missing my assignment.",
      audience: "teacher",
      userRole: "student",
      genre: "normal",
      startingChaos: 1,
    },
  });
  expect(createdResponse.status()).toBe(201);
  let state = (await createdResponse.json()).state;
  for (let index = 0; index < 4; index += 1) {
    const response = await request.post(`/api/cases/${state.id}/actions`, {
      data: { action: { type: "make_worse" }, expectedVersion: state.version, idempotencyKey: crypto.randomUUID() },
    });
    expect(response.status()).toBe(200);
    state = (await response.json()).state;
  }
  expect(state.arcade.pendingRound).toMatchObject({ durationMs: 8000, targetCount: 3 });

  const forged = await request.post(`/api/cases/${state.id}/actions`, {
    data: {
      action: { type: "resolve_arcade_round", roundId: "forged", collected: 3, hazardsHit: 0, skipped: false },
      expectedVersion: state.version,
      idempotencyKey: crypto.randomUUID(),
    },
  });
  expect(forged.status()).toBe(409);

  const idempotencyKey = crypto.randomUUID();
  const resolved = await request.post(`/api/cases/${state.id}/actions`, {
    data: {
      action: { type: "resolve_arcade_round", roundId: state.arcade.pendingRound.id, collected: 0, hazardsHit: 0, skipped: true },
      expectedVersion: state.version,
      idempotencyKey,
    },
  });
  expect(resolved.status()).toBe(200);
  const resolvedState = (await resolved.json()).state;
  expect(resolvedState.arcade).toMatchObject({ roundsPlayed: 1, skips: 1 });
  expect(resolvedState.arcade.pendingRound).toBeUndefined();

  const replay = await request.post(`/api/cases/${state.id}/actions`, {
    data: {
      action: { type: "resolve_arcade_round", roundId: state.arcade.pendingRound.id, collected: 0, hazardsHit: 0, skipped: true },
      expectedVersion: state.version,
      idempotencyKey,
    },
  });
  expect(replay.status()).toBe(200);
  expect((await replay.json()).state.version).toBe(resolvedState.version);
});

test("completes the two-minute chaos loop", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Extrcuse Generater/);
  await expect(page.getByRole("heading", { name: "What’s your situation?" })).toBeVisible();
  await expect(page).toHaveScreenshot("creation.png", { fullPage: true, animations: "disabled" });

  if (testInfo.project.name === "desktop") {
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  }

  await page.getByRole("button", { name: /Generate excuse/i }).click();
  await expect(page.getByRole("heading", { name: "Your current excuse" })).toBeVisible();
  await expect(page.locator(".app-shell")).toHaveAttribute("data-chaos-level", "1");
  if (testInfo.project.name === "desktop") await expect(page.getByRole("button", { name: "Mute sound" })).toContainText("Sound on");
  await expect(page.locator(".toast").getByText(/Demo fallback active/i)).toBeVisible();
  await waitForSoundCue(page);
  await expect(page).toHaveScreenshot("calm-workspace.png", { fullPage: true, animations: "disabled" });

  await page.getByRole("button", { name: "Make it worse" }).click();
  await expect(page.locator(".document-heading")).toContainText("v.02");
  await expect(testInfo.project.name === "mobile" ? page.locator(".mobile-case-summary").getByText(/Chaos 3/i) : page.locator(".chaos-status").getByText(/Chaos 3/i)).toBeVisible();
  await page.getByRole("button", { name: "Add lore" }).click();
  await expect(page.locator(".lore-list").getByText("Emergency Backup Pigeon")).toBeVisible();
  await page.getByRole("button", { name: "Escalate universe" }).click();
  await expect(page.locator(".lore-list").getByText(/Aquarium Incident/i)).toBeVisible();

  await page.getByRole("button", { name: "Interrogate me" }).click();
  await expect(page.getByRole("heading", { name: /Teacher interrogation/i, level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  await waitForSoundCue(page);
  await expect(page).toHaveScreenshot("interrogation.png", { fullPage: true, animations: "disabled" });
  for (let question = 1; question <= 5; question += 1) {
    await page.getByLabel("Your answer").fill(`The Emergency Backup Pigeon gave answer ${question} about the aquarium timeline.`);
    await page.getByRole("button", { name: /Submit answer/i }).click();
    await skipPaperworkPanic(page);
  }

  await expect(page.getByText("JUST SUBMIT THE ASSIGNMENT.", { exact: true })).toBeVisible();
  await expect(page.getByText(/AI recommendation: Just submit the assignment/i)).toBeVisible();
  await expect(page.locator(".toast")).toContainText("Timeline checked");
  await waitForSoundCue(page);
  if (testInfo.project.name === "desktop") {
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  }
  if (testInfo.project.name === "mobile") {
    await expect(page.locator(".final-judgment")).toHaveScreenshot("final-judgment.png", { animations: "disabled" });
  } else {
    await expect(page).toHaveScreenshot("final-judgment.png", {
      fullPage: true,
      animations: "disabled",
    });
  }
});

test("reduced motion keeps critical chaos static and navigable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: /Generate excuse/i }).click();
  for (let index = 0; index < 4; index += 1) {
    await page.getByRole("button", { name: "Make it worse" }).click();
    await skipPaperworkPanic(page);
  }
  await expect(page.locator(".app-shell")).toHaveAttribute("data-chaos-level", "9");
  await expect(page.locator(".chaos-ticker")).toBeVisible();
  await expect(page.getByRole("button", { name: "Extrcuse Generater home" })).toBeVisible();
  const animationDuration = await page.locator(".wordmark").evaluate((element) => getComputedStyle(element).animationDuration);
  expect(["0.001ms", "1e-06s"]).toContain(animationDuration);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("captures the controlled carnival progression", async ({ page }) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: /Generate excuse/i }).click();
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  for (const level of [3, 5, 7, 9]) {
    await page.getByRole("button", { name: "Make it worse" }).click();
    await expect(page.locator(".app-shell")).toHaveAttribute("data-chaos-level", String(level));
    if (level === 9) {
      await expect(page.getByRole("dialog", { name: "Paperwork Panic" })).toBeVisible();
      const freezeAt = await page.evaluate(() => Date.now());
      await page.clock.pauseAt(freezeAt + 1000);
      await expect(page).toHaveScreenshot("paperwork-panic.png", { fullPage: true, animations: "disabled" });
      await page.clock.resume();
      await skipPaperworkPanic(page);
    }
    await page.getByRole("button", { name: "Dismiss notification" }).click();
    await waitForSoundCue(page);
    await expect(page).toHaveScreenshot(`chaos-${level}.png`, { fullPage: true, animations: "disabled" });
  }

  const themeButton = page.getByRole("button", { name: /Switch to dark theme/i });
  if (await themeButton.isVisible()) {
    await themeButton.click();
  } else {
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("button", { name: "Dark theme" }).click();
  }
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page).toHaveScreenshot("chaos-9-dark.png", { fullPage: true, animations: "disabled" });
});

test("sound can be muted before its first action and the preference persists", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop header exposes the persistent sound control.");
  await page.goto("/");
  const sound = page.getByRole("button", { name: "Mute sound" });
  await expect(sound).toContainText("Sound armed");
  await sound.click();
  await expect(page.getByRole("button", { name: "Turn sound on" })).toContainText("Sound off");
  await page.reload();
  await expect(page.getByRole("button", { name: "Turn sound on" })).toContainText("Sound off");
});

test("pending arcade rounds survive reload and Escape skips safely", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop covers reload and keyboard escape; mobile controls are captured separately.");
  await page.goto("/");
  await page.getByRole("button", { name: /Generate excuse/i }).click();
  for (let index = 0; index < 4; index += 1) await page.getByRole("button", { name: "Make it worse" }).click();
  await expect(page.getByRole("dialog", { name: "Paperwork Panic" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("dialog", { name: "Paperwork Panic" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Paperwork Panic" })).toBeHidden();
  await expect(page.getByText("JUST SUBMIT THE ASSIGNMENT.", { exact: true })).toBeVisible();
});

test("theme and browser-linked history work", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Generate excuse/i }).click();
  await page.getByRole("button", { name: /Save case/i }).click();

  const themeButton = page.getByRole("button", { name: /Switch to dark theme/i });
  if (await themeButton.isVisible()) {
    await themeButton.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  } else {
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("button", { name: "Dark theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  }

  const historyButton = page.getByRole("button", { name: "History" }).first();
  if (!(await historyButton.isVisible())) await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "History" }).first().click();
  await expect(page.getByRole("heading", { name: "Case history" })).toBeVisible();
  await expect(page.getByText(/CASE #001/).first()).toBeVisible();
});
