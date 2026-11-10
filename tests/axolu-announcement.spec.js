import { test, expect } from '@playwright/test';

test('annonce Axolu : logos, fermeture OK et clic extérieur', async ({ page }) => {
  await page.goto('/confirmation-client');
  const dialog = page.getByRole('dialog', { name: 'Martine Adam devient Groupe Axolu CPA Inc.' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('img')).toHaveCount(0);
  await expect(dialog.getByRole('link')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('navigation').getByText('Groupe Axolu CPA Inc.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(dialog).toBeVisible();
  await page.mouse.click(2, 2);
  await expect(dialog).not.toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
});

test('annonce Axolu : fermeture automatique après 30 secondes', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  const dialog = page.getByRole('dialog', { name: 'Martine Adam devient Groupe Axolu CPA Inc.' });
  await expect(dialog).toBeVisible();
  await page.clock.fastForward(29000);
  await expect(dialog).toBeVisible();
  await page.clock.fastForward(1000);
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL('/');
});
