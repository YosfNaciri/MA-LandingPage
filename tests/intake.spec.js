import { test, expect } from '@playwright/test';

const user = { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', email: 'client@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const enc = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = `${enc({ alg: 'HS256' })}.${enc({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })}.test`;
async function mockClient(page, { existing = false, denied = false } = {}) {
  await page.route('**/auth/v1/**', route => route.fulfill({ json: user }));
  await page.route('**/rest/v1/client_intake_submissions*', route => {
    expect(new URL(route.request().url()).searchParams.get('user_id')).toBe(`eq.${user.id}`);
    return route.fulfill(denied ? { status: 403, json: { message: 'denied' } } : { json: existing ? [{ id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', user_id: user.id, created_at: '2026-10-22T12:00:00Z', status: 'Nouveau', nom_legal: 'Client Test', payload: { form_data: { nom_legal: 'Client Test' } } }] : [] });
  });
  await page.route('**/rest/v1/client_intake_documents*', route => route.fulfill({ json: [] }));
  await page.goto(`/ouverture-dossier#access_token=${token}&refresh_token=test-refresh&expires_in=3600&token_type=bearer&type=magiclink`);
}

test('demande de lien : adresse, redirection et confirmation', async ({ page }) => {
  let payload;
  await page.route('**/auth/v1/otp*', route => {
    payload = route.request().postDataJSON();
    expect(new URL(route.request().url()).searchParams.get('redirect_to')).toBe('http://127.0.0.1:4175/ouverture-dossier');
    return route.fulfill({ json: {} });
  });
  await page.goto('/demande-acces');
  await page.getByLabel('Adresse email').fill('client@example.test');
  await page.getByRole('button', { name: 'Recevoir mon lien' }).click();
  await expect(page.getByRole('status')).toContainText('lien sécurisé');
  expect(payload.email).toBe(user.email);
  expect(payload.create_user).toBe(true);
});

test('erreur envoi lisible et possibilité de réessayer', async ({ page }) => {
  await page.route('**/auth/v1/otp*', route => route.fulfill({ status: 429, json: { message: 'rate limit' } }));
  await page.goto('/demande-acces');
  await page.getByLabel('Adresse email').fill(user.email);
  await page.getByRole('button', { name: 'Recevoir mon lien' }).click();
  await expect(page.getByRole('alert')).toContainText('Impossible');
  await expect(page.getByRole('button', { name: 'Recevoir mon lien' })).toBeEnabled();
});

test('aucun formulaire sans session', async ({ page }) => {
  await page.goto('/ouverture-dossier');
  await expect(page.getByRole('heading', { name: 'Accès non autorisé' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Recevoir un lien' })).toHaveAttribute('href', '/demande-acces');
});

test('lien reçu : nouveau client accède au formulaire original', async ({ page }) => {
  await mockClient(page);
  await expect(page.getByText('Connecté avec :')).toContainText(user.email);
  await expect(page.getByLabel('Type de client', { exact: false })).toBeVisible();
  await expect(page).not.toHaveURL(/access_token/);
});

test('client existant retrouve son dossier puis peut quitter', async ({ page }) => {
  await mockClient(page, { existing: true });
  await expect(page.getByRole('heading', { name: 'Mon dossier', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Quitter', exact: true }).click();
  await expect(page).toHaveURL('/demande-acces');
  await page.goto('/ouverture-dossier');
  await expect(page.getByRole('heading', { name: 'Accès non autorisé' })).toBeVisible();
});

test('erreur de lecture ne permet pas de créer un doublon', async ({ page }) => {
  await mockClient(page, { denied: true });
  await expect(page.getByRole('heading', { name: 'Dossier indisponible' })).toBeVisible();
  await expect(page.getByLabel('Type de client', { exact: false })).toHaveCount(0);
});

test('soumission complète : dossier, pièce jointe et Excel puis suivi', async ({ page }) => {
  await mockClient(page);
  let saved;
  const documents = [];
  const uploads = [];
  await page.route('**/rest/v1/client_intake_submissions*', async route => {
    if (route.request().method() === 'POST') {
      saved = route.request().postDataJSON();
      return route.fulfill({ status: 201, body: '' });
    }
    return route.fulfill({ json: saved ? [{ ...saved, created_at: new Date().toISOString() }] : [] });
  });
  await page.route('**/rest/v1/client_intake_documents*', route => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      documents.push(...(Array.isArray(body) ? body : [body]));
      return route.fulfill({ status: 201, body: '' });
    }
    return route.fulfill({ json: documents });
  });
  await page.route('**/storage/v1/object/intake-documents/**', route => {
    uploads.push(route.request().url());
    return route.fulfill({ json: { Key: 'intake-documents/test' } });
  });
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByRole('heading', { name: 'Identification et coordonnées' })).toBeVisible();
  await page.locator('#type_client').selectOption('particulier');
  for (const [id, value] of Object.entries({ nom_legal: 'Client Test', telephone: '5145550100', courriel: user.email })) {
    await page.locator(`#${id}`).fill(value);
  }
  for (const [placeholder, value] of Object.entries({ 'Numéro et rue': '1 rue Test', Ville: 'Montréal', Province: 'QC', 'Code postal': 'H1A 1A1' })) await page.getByPlaceholder(placeholder, { exact: true }).fill(value);
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.locator('#declarations_anterieures').setInputFiles({ name: 'document-test.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') });
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('button', { name: 'Envoyer le dossier', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Mon dossier', exact: true })).toBeVisible();
  expect(saved.user_id).toBe(user.id);
  expect(saved.payload.form_data.nom_legal).toBe('Client Test');
  expect(uploads).toHaveLength(2);
  expect(documents.map(document => document.document_type)).toEqual(['declarations_anterieures', 'form_response_excel']);
  for (const document of documents) {
    expect(document.user_id).toBe(user.id);
    expect(document.submission_id).toBe(saved.id);
    expect(document.storage_path).toMatch(new RegExp(`^${user.id}/${saved.id}/`));
  }
});
