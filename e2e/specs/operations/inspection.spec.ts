import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../../helpers/auth';

test.describe('E2E Front/Operations Inspection', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('captures inspection values and persists save', async ({ page }) => {
    await page.goto('/inspection');

    const vehicleCard = page.getByRole('button', { name: /AA10\d{2}BB/i }).first();
    await vehicleCard.click();

    await page.locator('.status-toggle').nth(1).click();

    await page.getByRole('button', { name: /save inspection/i }).click();
    await expect(page.locator('text=Inspection saved successfully.')).toBeVisible();
  });
});
