import { expect, test } from "@playwright/test";

test("MVP HUD shows starting shells and castle HP", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#shells")).toContainText("50");
  await expect(page.locator("#castle")).toContainText("20/20");
});
