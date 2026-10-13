import { test, expect } from '@playwright/test';
import { toConfirmationRecord } from '../src/lib/clientConfirmations.js';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const example = {
  id: '11111111-1111-1111-1111-111111111111', created_at: '2026-10-12T12:00:00Z', tax_season: '2026',
  respondent_first_name: 'Élodie', respondent_last_name: 'Test', wants_tax_service: true,
  people: [{ id: 1, first_name: 'Élodie', last_name: 'Test', relation: 'self', prepared_2025: 'yes' }],
  total_people: 1, old_clients_count: 1, to_validate_count: 0, is_couple: false, has_children: false,
  children_count: 0, identification_person_name: 'Élodie Test', sin_last_three: '007',
  particularities: [{ type: 'dependent', person_name: 'Élodie Test', note: 'Précision de test' }],
  document_method: 'paper', document_method_note: '=1+1', phone: '0123456789', email: 'elodie@example.test', no_email: false,
};
const rows = [example, { ...example, id: '22222222-2222-2222-2222-222222222222', respondent_first_name: 'Alex', respondent_last_name: 'Autre', wants_tax_service: false, tax_season: '2025', email: 'alex@example.test', people: [{ first_name: 'Alex', last_name: 'Autre', relation: 'self' }] }];

async function api(page, { admin = true, failLogin = false, failRead = false, rawData = false, data = rows } = {}) {
  const user = { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', aud: 'authenticated', role: 'authenticated', email: 'admin@example.test', app_metadata: { role: admin ? 'admin' : 'member' }, user_metadata: { role: 'admin' }, created_at: '2026-01-01T00:00:00Z' };
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600, app_metadata: user.app_metadata })}.test-signature`;
  const session = { access_token: token, refresh_token: 'test-refresh-token', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user };
  let reads = 0;
  await page.route('**/auth/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/logout')) return route.fulfill({ status: 204 });
    if (path.endsWith('/token') && failLogin) return route.fulfill({ status: 400, json: { error: 'invalid_grant', error_description: 'Invalid login credentials' } });
    return route.fulfill({ status: 200, json: path.endsWith('/user') ? user : session });
  });
  await page.route('**/rest/v1/**', async (route) => {
    reads++;
    if (failRead) return route.fulfill({ status: 403, json: { code: '42501', message: 'denied' } });
    const url = new URL(route.request().url());
    const offset = Number(url.searchParams.get('offset') || 0);
    // Simulate a server limiting pages to one row to verify complete exports.
    return route.fulfill({ status: 200, json: data.slice(offset, offset + 1).map(row => rawData ? row : ({ ...toConfirmationRecord(row), id: row.id, created_at: row.created_at })) });
  });
  return { reads: () => reads };
}

async function login(page) {
  await page.goto('/admin/login');
  await page.getByLabel('Courriel', { exact: true }).fill('admin@example.test');
  await page.getByLabel('Mot de passe').fill('test-password');
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
}

test('pages privées inaccessibles sans session', async ({ page }) => {
  const mock = await api(page);
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL('/admin/login');
  await expect(page.getByRole('heading', { name: 'Connexion admin' })).toBeVisible();
  expect(mock.reads()).toBe(0);
});

test('un compte non admin est refusé même avec user_metadata.role admin', async ({ page }) => {
  const mock = await api(page, { admin: false });
  await login(page);
  await expect(page.getByRole('alert')).toContainText('n’a pas accès');
  expect(mock.reads()).toBe(0);
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL('/admin/login');
});

test('erreur de connexion lisible et formulaire réutilisable', async ({ page }) => {
  await api(page, { failLogin: true });
  await login(page);
  await expect(page.getByRole('alert')).toContainText('Connexion impossible');
  await expect(page.getByRole('button', { name: 'Se connecter', exact: true })).toBeEnabled();
});

test('connexion, recherche, détails, export complet CSV/Excel et déconnexion', async ({ page }, testInfo) => {
  const mock = await api(page);
  await login(page);
  await expect(page).toHaveURL('/admin/dashboard');
  await expect(page.getByText('2 confirmation(s) affichée(s) sur 2')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Élodie Test', exact: true })).toBeVisible();
  await expect(page.getByText('007', { exact: true })).toBeVisible();
  await expect(page.getByText('Autre situation à signaler', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('2 confirmation(s) affichée(s) sur 2')).toBeVisible();
  await page.getByLabel('Rechercher un client').fill('elodie');
  await expect(page.getByText('1 confirmation(s) affichée(s) sur 2')).toBeVisible();
  await page.getByLabel('Saison fiscale', { exact: true }).selectOption('2025');
  await expect(page.getByText('Aucune confirmation ne correspond aux filtres.')).toBeVisible();
  await page.getByLabel('Saison fiscale', { exact: true }).selectOption('');
  await page.getByRole('button', { name: 'Exporter', exact: true }).click();
  const csvPending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSV (.csv)', exact: true }).click();
  const csv = await csvPending;
  const csvPath = testInfo.outputPath('confirmations.csv');
  await csv.saveAs(csvPath);
  const content = readFileSync(csvPath, 'utf8');
  expect(content.startsWith('\uFEFF')).toBe(true);
  expect(content).toContain('Élodie');
  expect(content).toContain('Alex'); // Filter does not truncate exports.
  expect(content).toContain("'=1+1");
  await page.getByRole('button', { name: 'Exporter', exact: true }).click();
  const excelPending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Excel (.xlsx)', exact: true }).click();
  const excel = await excelPending;
  const excelPath = testInfo.outputPath('confirmations.xlsx');
  await excel.saveAs(excelPath);
  execFileSync('python3', ['-c', `import zipfile,sys,xml.etree.ElementTree as E
with zipfile.ZipFile(sys.argv[1]) as z:
 assert z.testzip() is None
 for name in z.namelist(): E.fromstring(z.read(name))
 root=E.fromstring(z.read('xl/worksheets/sheet1.xml'))
 ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
 assert len(root.findall('s:sheetData/s:row',ns))==3
 assert not root.findall('.//s:f',ns)
 cells=root.findall('.//s:c',ns)
 for value in ['007','0123456789','=1+1','Élodie','Alex']:
  assert any(c.attrib.get('t')=='inlineStr' and c.find('s:is/s:t',ns) is not None and c.find('s:is/s:t',ns).text==value for c in cells), value
`, excelPath]);
  expect(mock.reads()).toBeGreaterThanOrEqual(9);
  await page.screenshot({ path: testInfo.outputPath('admin-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Déconnexion', exact: true }).click();
  await expect(page).toHaveURL('/admin/login');
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL('/admin/login');
});

test('lecture refusée : message et absence de données exportables', async ({ page }) => {
  await api(page, { failRead: true });
  await login(page);
  await expect(page.getByRole('alert')).toContainText('Impossible de charger');
  await expect(page.getByRole('button', { name: 'Exporter', exact: true })).toBeDisabled();
});

test('tableau de bord mobile sans débordement', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await api(page);
  await login(page);
  await expect(page.getByText('2 confirmation(s) affichée(s) sur 2')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('admin-mobile.png'), fullPage: true });
});


test('réponse absente et JSON incomplet', async ({ page }) => {
  await api(page, { rawData: true, data: [{ id: 'empty', tax_year: 2026, first_name: null, last_name: null, wants_tax_service: null, people: [null], yes_data: null, no_data: null, status: 'pending', created_at: null }] });
  await login(page);
  await expect(page.getByRole('heading', { name: 'Client sans nom' })).toBeVisible();
  await expect(page.getByText('1 confirmation(s) affichée(s) sur 1')).toBeVisible();
  await expect(page.getByText('Invalid Date', { exact: false })).toHaveCount(0);
});
