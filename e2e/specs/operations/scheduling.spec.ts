import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../../helpers/auth';

test.describe('E2E Front/Operations Scheduling', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('assigns a pending operation to an operator slot', async ({ page }) => {
    await page.goto('/scheduling');
    await expect(page.getByRole('heading', { name: /^Pending Operations$/ })).toBeVisible();

    await page.locator('tbody tr').first().locator('td').nth(1).click();

    const modal = page.locator('#assign_modal');
    await expect(modal).toBeVisible();
    await modal.locator('select').selectOption({ index: 1 });
    await modal.getByRole('button', { name: /confirm assignment/i }).click();

    await expect(modal).not.toBeVisible();
    await expect(page.locator('td div.bg-primary').first()).toBeVisible();
  });
});
