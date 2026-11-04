import { test, expect } from '@playwright/test';

test('accueil : métadonnées disponibles sans exécution JavaScript et sitemap public', async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(html).toContain('lang="fr-CA"');
  expect(html).toContain('<title>Martine Adam CPA Inc. | Cabinet comptable et impôts</title>');
  expect(html).toContain('name="description"');
  expect(html).toContain('href="https://martineadamcpa.com/"');
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Sitemap: https://martineadamcpa.com/sitemap.xml');
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('<loc>https://martineadamcpa.com/</loc>');
  expect(sitemap).not.toContain('/admin');
});

test('métadonnées distinctes des formulaires et retour à l’accueil', async ({ page }) => {
  await page.goto('/confirmation-client');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  await expect(page).toHaveTitle('Confirmez votre intention | Martine Adam CPA Inc.');
  await page.locator('a[href="/#Home"]').click();
  await expect(page).toHaveTitle('Martine Adam CPA Inc. | Cabinet comptable et impôts');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://martineadamcpa.com/');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /TaxDome/);
  expect(JSON.parse(await page.locator('#website-schema').textContent()).name).toBe('Martine Adam CPA Inc.');
});
