import { expect, test } from '@playwright/test';
import { goToAppRoute, loginAsAdmin } from '../../helpers/auth';

test.describe('E2E Front/Main Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('renders dashboard widgets and quick actions navigate', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/dashboard/i);
    await expect(page.locator('text=Active Vehicles')).toBeVisible();
    await expect(page.locator('text=Pending Inspections')).toBeVisible();

    await page.click('a[href="/vehicles"]:has-text("New Vehicle")');
    await expect(page).toHaveURL(/\/vehicles$/);

    await goToAppRoute(page, '/dashboard');
    await page.click('a[href="/inspection"]');
    await expect(page).toHaveURL(/\/inspection$/);
  });
});
