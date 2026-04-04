import { expect, test } from "@playwright/test";

test("MVP HUD shows starting shells and castle HP in sidebar", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#statShells")).toContainText("50");
  await expect(page.locator("#statCastle")).toContainText("20");
  await expect(page.locator("#statCastle")).toContainText("/");
});

test("sidebar shows armory and send wave", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#inventory")).toBeVisible();
  await expect(page.locator("#statShells")).toContainText("50");
  await expect(page.locator("#invArcSpine")).toBeVisible();
  await expect(page.locator("#sendWave")).toBeVisible();
  await expect(page.locator("#arcSpineStatus")).toContainText(/Available|shells/);
});
