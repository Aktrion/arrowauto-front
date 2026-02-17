import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../../helpers/auth';

test.describe('E2E Front/Customer Portal', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('approves selected customer repairs from portal UI', async ({ page }) => {
    const token = await page.evaluate(() => {
      const persisted = localStorage.getItem('auth');
      if (!persisted) return null;
      try {
        return JSON.parse(persisted)?.token ?? null;
      } catch {
        return null;
      }
    });

    const valuesResponse = await page.request.post('http://localhost:3000/inspection-values/search', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      data: {
        page: 1,
        limit: 1,
        filters: {
          value: {
            value: 'red',
            operator: 'equals',
          },
        },
      },
    });
    const valuesJson = (await valuesResponse.json()) as {
      data?: Array<{ product?: { vehicleId?: string } }>;
    };
    const vehicleId = valuesJson.data?.[0]?.product?.vehicleId;

    await page.goto(vehicleId ? `/customer-portal?vehicleId=${vehicleId}` : '/customer-portal');

    const checkboxes = page.locator('input.checkbox.checkbox-primary.checkbox-lg');
    if ((await checkboxes.count()) === 0) {
      await expect(page.locator('text=No items selected')).toBeVisible();
      return;
    }
    const firstCheckbox = checkboxes.first();
    await firstCheckbox.check();

    await page.getByRole('button', { name: /approve/i }).first().click();
    const modal = page.locator('#confirm_modal');
    await expect(modal).toBeVisible();

    await modal.getByRole('button', { name: /yes.*approve/i }).click();
    await expect(page.locator('.toast .alert-success')).toBeVisible();
  });
});
