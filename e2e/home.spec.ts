import { test, expect } from "@playwright/test";

test("homepage loads and displays hero", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Stratus/);
  await expect(
    page.getByRole("heading", { name: /Industrial Automation/i })
  ).toBeVisible();
  await expect(page.getByText(/Modernized/i)).toBeVisible();
});

test("navigation links are present", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Products/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Pricing/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /About/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Contact/i }).first()).toBeVisible();
});
