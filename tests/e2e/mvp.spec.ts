import { expect, test, type Page } from "@playwright/test";

async function beginMission(page: Page): Promise<void> {
  await page.goto("/");
  await page.locator("#btnPlay").click();
}

test("MVP HUD shows starting shells and castle HP in sidebar", async ({
  page,
}) => {
  await beginMission(page);
  await expect(page.locator("#statShells")).toContainText("50");
  await expect(page.locator("#statCastle")).toContainText("20");
  await expect(page.locator("#statCastle")).toContainText("/");
});

test("sidebar shows armory and send wave", async ({ page }) => {
  await beginMission(page);
  await expect(page.locator("#inventory")).toBeVisible();
  await expect(page.locator("#statShells")).toContainText("50");
  await expect(page.locator("#invArcSpine")).toBeVisible();
  await expect(page.locator("#sendWave")).toBeVisible();
  await expect(page.locator("#arcSpineStatus")).toContainText(/Available|shells/);
  await expect(page.locator("#waveProgressTrack")).toBeVisible();
  await expect(page.locator("#waveProgressFraction")).toHaveText(/\d+\s*\/\s*\d+/);
});

test("main menu lists levels and starts selected map", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('input[name="levelId"]')).toHaveCount(3);
  await expect(
    page.locator('input[name="levelId"][value="first_trench"]'),
  ).toBeChecked();
  await page.locator('input[name="levelId"][value="trench_gate"]').click();
  await page.locator("#btnPlay").click();
  await expect(page.locator("#gameScreen")).toHaveAttribute(
    "data-active-map",
    "trench_gate",
  );
});

test("main menu can start hydra convergence map", async ({ page }) => {
  await page.goto("/");
  await page
    .locator('input[name="levelId"][value="hydra_convergence"]')
    .click();
  await page.locator("#btnPlay").click();
  await expect(page.locator("#gameScreen")).toHaveAttribute(
    "data-active-map",
    "hydra_convergence",
  );
});

test("main menu and quit confirmation return to home", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#mainMenu")).toBeVisible();
  await expect(page.locator("#gameScreen")).toBeHidden();
  await page.locator("#btnPlay").click();
  await expect(page.locator("#inventory")).toBeVisible();
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
