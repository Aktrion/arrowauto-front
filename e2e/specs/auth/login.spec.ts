import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../../helpers/auth';

test.describe('E2E Front/Auth', () => {
  test('logs in from UI and redirects to dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.locator('h1')).toContainText(/dashboard/i);
  });
});
