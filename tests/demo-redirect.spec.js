import { test, expect } from '@playwright/test';

test('la démonstration reste ouverte puis redirige après 30 secondes', async ({ page }) => {
  await page.route('https://www.google.com/**', route => route.fulfill({ body: 'Destination de démonstration' }));
  await page.clock.install();
  await page.goto('/demo-redirect');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { level: 1 })).toContainText('La même équipe');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await page.clock.fastForward(29_000);
  await expect(page).toHaveURL(/\/demo-redirect$/);
  await expect(page.getByRole('timer')).toHaveText('1 s');
  await page.clock.fastForward(1_000);
  await expect(page).toHaveURL('https://www.google.com/');
});

test('le bouton redirige immédiatement depuis le chemin avec espace', async ({ page }) => {
  await page.route('https://www.google.com/**', route => route.fulfill({ body: 'Destination de démonstration' }));
  await page.goto('/demo%20-redirect');
  await page.getByRole('link', { name: 'Découvrir notre nouveau site' }).click();
  await expect(page).toHaveURL('https://www.google.com/');
});
