import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("completes the two-minute chaos loop", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Maximum Extra/);
  await expect(page.getByRole("heading", { name: "What’s your situation?" })).toBeVisible();
  await expect(page).toHaveScreenshot("creation.png", { fullPage: true, animations: "disabled" });

  if (testInfo.project.name === "desktop") {
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  }

  await page.getByRole("button", { name: /Generate excuse/i }).click();
  await expect(page.getByRole("heading", { name: "Your current excuse" })).toBeVisible();
  await expect(page.getByText(/Demo fallback active/i)).toBeVisible();
  await expect(page).toHaveScreenshot("calm-workspace.png", { fullPage: true, animations: "disabled" });

  await page.getByRole("button", { name: "Make it worse" }).click();
  await expect(page.getByText(/Chaos 3/i).first()).toBeVisible();
  await page.getByRole("button", { name: "Add lore" }).click();
  await expect(page.getByText("Raymond").first()).toBeVisible();
  await page.getByRole("button", { name: "Escalate universe" }).click();
  await expect(page.getByText(/Aquarium Incident/i).first()).toBeVisible();

  await page.getByRole("button", { name: "Interrogate me" }).click();
  await expect(page.getByRole("heading", { name: /interrogation/i })).toBeVisible();
  await expect(page).toHaveScreenshot("interrogation.png", { fullPage: true, animations: "disabled" });
  for (let question = 1; question <= 5; question += 1) {
    await page.getByLabel("Your answer").fill(`Raymond gave answer ${question} about the aquarium timeline.`);
    await page.getByRole("button", { name: /Submit answer/i }).click();
  }

  await expect(page.getByText("JUST SUBMIT THE ASSIGNMENT.")).toBeVisible();
  await expect(page.getByText(/AI recommendation: Just submit the assignment/i)).toBeVisible();
  await expect(page).toHaveScreenshot("final-judgment.png", { fullPage: true, animations: "disabled" });
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
