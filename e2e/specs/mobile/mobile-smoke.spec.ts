import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../../helpers/auth';

test.describe('E2E Front/Mobile Smoke', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('core routes render on mobile viewport', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText(/dashboard/i);

    await page.goto('/vehicles');
    await expect(page.locator('h1')).toContainText(/vehicles/i);

    await page.goto('/inspection');
    await expect(page.locator('h1')).toContainText(/inspection/i);

    await page.goto('/clients');
    await expect(page.locator('h1')).toContainText(/clients/i);
  });
});
