import { expect, Page } from '@playwright/test';

export async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.locator('input[formcontrolname="userName"]').fill('admin');
  await page.locator('input[formcontrolname="password"]').fill('Seed123!');

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/auth/login') && response.request().method() === 'POST',
  );

  await page.getByRole('button', { name: /sign in/i }).click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function goToAppRoute(page: Page, route: string) {
  await page.goto(route);
  await page.waitForLoadState('networkidle');
}
