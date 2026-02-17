import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../../helpers/auth';

test.describe('E2E Front/Main Vehicles', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('creates a vehicle from UI and shows it in listing', async ({ page }) => {
    const suffix = Date.now().toString().slice(-6);
    const plate = `E2E${suffix}`;

    await page.goto('/vehicles/new');
    await page.locator('input[placeholder="e.g. AB12 CDE"]').fill(plate);
    await page.locator('input[placeholder="e.g. BMW"]').fill('Tesla');
    await page.locator('input[placeholder="e.g. 320d M Sport"]').fill('Model 3');
    await page.locator('button.btn-premium').click();

    await expect(page).toHaveURL(/\/vehicles$/);

    await page.locator('input[placeholder*="Search"]').fill(plate);
    await expect(page.locator(`text=${plate}`).first()).toBeVisible();
  });
});
