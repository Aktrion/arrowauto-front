import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../../helpers/auth';

test.describe('E2E Front/Settings Clients', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('creates a client and filters it in clients module', async ({ page }) => {
    const suffix = Date.now().toString().slice(-6);
    const fullName = `E2E Client ${suffix}`;
    const email = `e2e.${suffix}@example.com`;

    await page.goto('/clients');
    await page.getByRole('button', { name: /add client/i }).click();

    const modal = page.locator('#new_client_modal');
    await expect(modal).toBeVisible();
    await modal.locator('input[placeholder="John Smith"]').fill(fullName);
    await modal.locator('input[type="email"]').fill(email);
    await modal.locator('input[type="tel"]').fill('+34 600 123 123');
    await modal.getByRole('button', { name: /create client/i }).click();

    await expect(modal).not.toBeVisible();

    await page.locator('input[placeholder*="Search"]').fill(fullName);
    await expect(page.locator(`text=${fullName}`)).toBeVisible();
  });
});
