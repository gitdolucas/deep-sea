import { expect, test, type Page } from "@playwright/test";

async function beginMission(page: Page): Promise<void> {
  await page.goto("/");
  await page.locator("#btnPlay").click();
}

test("MVP HUD shows shells and castle HP", async ({ page }) => {
  await beginMission(page);
  await expect(page.locator("#statShells")).toHaveText(/\d+/);
  await expect(page.locator("#statCastle")).toContainText("/");
});

test("in-game HUD shows shells, speed, send wave, wave progress", async ({
  page,
}) => {
  await beginMission(page);
  await expect(page.locator("#gameHud")).toBeVisible();
  await expect(page.locator("#statShells")).toHaveText(/\d+/);
  await expect(page.locator("#sendWave")).toBeVisible();
  await expect(page.locator("#hudSpeed")).toBeVisible();
  await expect(page.locator("#section-armory")).toHaveCount(1);
  await expect(page.locator("#defenseInventoryGrid")).toBeVisible();
  await expect(page.locator("#waveProgressTrack")).toBeVisible();
  await expect(page.locator("#waveProgressFraction")).toHaveText(/\d+\s*\/\s*\d+/);
});

test("main menu starts placeholder map when no levels bundled", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator('input[name="levelId"]')).toHaveCount(0);
  await page.locator("#btnPlay").click();
  await expect(page.locator("#gameScreen")).toHaveAttribute(
    "data-active-map",
    "minimal_placeholder",
  );
});

test("main menu and quit confirmation return to home", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#mainMenu")).toBeVisible();
  await expect(page.locator("#gameScreen")).toBeHidden();
  await page.locator("#btnPlay").click();
  await expect(page.locator("#gameHud")).toBeVisible();
  await page.locator("#btnMainMenu").click();
  await expect(page.locator("#quitDialog")).toBeVisible();
  await page.locator("#quitConfirmNo").click();
  await expect(page.locator("#quitDialog")).toBeHidden();
  await page.locator("#btnMainMenu").click();
  await page.locator("#quitConfirmYes").click();
  await expect(page.locator("#mainMenu")).toBeVisible();
  await expect(page.locator("#gameScreen")).toBeHidden();
  await expect(page.locator("#gameScreen")).not.toHaveAttribute(
    "data-active-map",
  );
});
