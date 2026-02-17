import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../../helpers/auth';

test.describe('E2E Front/Operations Invoicing', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('completes and invoices an operation from UI', async ({ page }) => {
    await page.goto('/invoicing');

    const row = page
      .locator('tbody tr')
      .filter({ has: page.getByRole('button', { name: /complete/i }) })
      .first();
    await row.hover();
    await row.getByRole('button', { name: /complete/i }).click();

    const modal = page.locator('#complete_modal');
    await expect(modal).toBeVisible();
    await modal.locator('input[type="number"]').first().fill('90');
    await modal.locator('input[type="number"]').nth(1).fill('55');
    await modal.getByRole('button', { name: /mark complete/i }).click();
    await expect(modal).not.toBeVisible();

    await page.getByRole('button', { name: /^Completed$/ }).click();
    const completedRow = page.locator('tbody tr').filter({ hasText: /completed/i }).first();
    await completedRow.getByRole('button', { name: /invoice/i }).click();

    await page.getByRole('button', { name: /^Invoiced$/ }).click();
    await expect(page.locator('tbody tr').first()).toBeVisible();
  });
});
