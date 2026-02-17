import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../../helpers/auth';

test.describe('E2E Front/Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('navigates settings sections and loads data blocks', async ({ page }) => {
    await page.goto('/settings');

    await expect(page.locator('h1')).toContainText(/settings/i);

    await page.getByRole('button', { name: /Operations/i }).click();
    await expect(page.locator('text=Service Operations')).toBeVisible();

    await page.getByRole('button', { name: /Inspection Templates/i }).click();
    await expect(page.locator('text=Inspection Templates')).toBeVisible();

    await page.getByRole('button', { name: /Tyre Configurations/i }).click();
    await expect(page.locator('text=Tyre Configurations')).toBeVisible();

    await page.getByRole('button', { name: /Users & Operators/i }).click();
    await expect(page.locator('text=Users & Operators')).toBeVisible();
  });
});
