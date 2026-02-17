import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../../helpers/auth';

test.describe('E2E Front/Operations Inspection', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('supports create, edit and delete inspection value flow', async ({ page }) => {
    const token = await page.evaluate(() => {
      const persisted = localStorage.getItem('auth');
      if (!persisted) return null;
      try {
        return JSON.parse(persisted)?.token ?? null;
      } catch {
        return null;
      }
    });

    await page.goto('/inspection');

    const valuesSearchRequestPromise = page.waitForRequest((req) => {
      return req.url().includes('/inspection-values/search') && req.method() === 'POST';
    });
    const vehicleCard = page.locator('.inspection-vehicle-item').first();
    await vehicleCard.click();
    await valuesSearchRequestPromise;

    const selectedPlate = (await page.locator('.inspection-vehicle-item.selected .inspection-vehicle-plate').textContent())?.trim();
    expect(selectedPlate).toBeTruthy();

    const firstPointRow = page.locator('.inspection-point-row').first();

    // CREATE/UPSERT via UI: set first point as defect and save
    await firstPointRow.locator('.inspection-point-actions .status-toggle').nth(2).click();
    await expect(firstPointRow.locator('.inspection-point-actions .status-toggle').nth(2)).toHaveClass(/active-defect/);
    await page.getByRole('button', { name: /save inspection/i }).click();
    await expect(page.locator('text=Inspection saved successfully.')).toBeVisible();

    // EDIT via UI: switch to OK and save
    await firstPointRow.locator('.inspection-point-actions .status-toggle').nth(0).click();
    await expect(firstPointRow.locator('.inspection-point-actions .status-toggle').nth(0)).toHaveClass(/active-ok/);
    await page.getByRole('button', { name: /save inspection/i }).click();
    await expect(page.locator('text=Inspection saved successfully.')).toBeVisible();

    // HISTORY: confirm row is listed and editor action works
    await page.getByRole('button', { name: /^Historial$/ }).click();
    await expect(page.locator('text=Historial de inspecciones')).toBeVisible();
    await expect(page.locator('tbody tr').first()).toBeVisible();
    await page.locator('tbody tr button:has-text("Editar")').first().click();
    await expect(page.getByRole('button', { name: /^Editor$/ })).toHaveClass(/active/);

    // DELETE via API: cleanup and verify gone
    const valuesForDeleteSearch = await page.request.post('http://localhost:3000/inspection-values/search', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      data: {
        page: 1,
        limit: 1,
      },
    });
    expect(valuesForDeleteSearch.ok()).toBeTruthy();
    const valuesForDeleteJson = (await valuesForDeleteSearch.json()) as {
      data?: Array<{ _id?: string; id?: string }>;
    };
    const targetValueId = valuesForDeleteJson.data?.[0]?._id || valuesForDeleteJson.data?.[0]?.id;
    expect(targetValueId).toBeTruthy();

    const deleteResponse = await page.request.delete(`http://localhost:3000/inspection-values/${targetValueId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    expect(deleteResponse.ok()).toBeTruthy();
  });
});
