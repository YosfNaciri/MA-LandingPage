import { test, expect } from '@playwright/test';

async function identity(page) {
  await page.locator('#first-name').fill('Camille');
  await page.locator('#last-name').fill('Test');
  await page.locator('#person-1-prepared').selectOption('yes');
  await page.locator('#phone').fill('514 555-0123');
  await page.locator('#email').fill('camille@example.test');
}

async function intercept(page, status = 201) {
  const requests = [];
  await page.route('**/rest/v1/**', async (route) => {
    if (route.request().method() === 'POST') {
      expect(new URL(route.request().url()).pathname).toBe('/rest/v1/client_tax_season_confirmations');
      requests.push(route.request().postDataJSON());
    }
    await route.fulfill({ status, contentType: 'application/json', body: status === 201 ? '' : JSON.stringify({ message: 'Test failure' }) });
  });
  return requests;
}

for (const clientType of ['new_client', 'returning_client']) {
test(`acceptation, famille, particularités et payload compatible — ${clientType}`, async ({ page }) => {
  const requests = await intercept(page);
  await page.goto(clientType === 'new_client' ? '/confirmation-client/nouveau' : '/confirmation-client/formulaire');
  await page.getByRole('radio', { name: 'Oui', exact: true }).check();
  await identity(page);
  await page.getByRole('button', { name: 'Ajouter un conjoint' }).click();
  await page.locator('#person-2-first-name').fill('Alex');
  await page.locator('#person-2-last-name').fill('Test');
  await page.locator('#person-2-prepared').selectOption('yes');
  await expect(page.getByRole('button', { name: 'Ajouter un conjoint' })).toBeDisabled();
  await page.locator('#couple-sin-person').selectOption('2');
  await page.locator('#couple-sin').fill('123');
  await page.getByRole('button', { name: 'Ajouter un enfant' }).click();
  await page.locator('#person-3-first-name').fill('Enfant');
  await page.locator('#person-3-last-name').fill('Test');
  await page.locator('#person-3-prepared').selectOption('no');
  await page.getByLabel('Je ne les connais pas').check();
  await page.getByLabel('Travail autonome', { exact: true }).check();
  await expect(page.locator('#particularity-self_employed-person')).toHaveValue('1');
  await page.locator('#particularity-self_employed-person').selectOption('2');
  await page.locator('#particularity-self_employed-note').fill('Consultation');
  await page.getByRole('radio', { name: 'Électroniquement', exact: true }).check();
  await page.getByRole('button', { name: 'Envoyer ma réponse' }).click();
  await expect(page).toHaveURL('/confirmation-client/merci');
  await expect(page.getByRole('heading', { name: 'Merci !' })).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({ tax_year: 2026, first_name: 'Camille', last_name: 'Test', wants_tax_service: true, people_count: 3, status: 'completed', no_data: {}, yes_data: { old_clients_count: 2, to_validate_count: 1, is_couple: true, children_count: 1, sin_last_three: '123', identification_person_name: 'Alex Test', document_method: 'electronic' } });
  expect(requests[0]).not.toHaveProperty('tax_season');
  expect(requests[0].people[2]).toMatchObject({ relation: 'child', sin_unknown: true, sin_last_three: null });
  expect(requests[0].yes_data.particularities[0]).toMatchObject({ type: 'self_employed', person_id: 2 });
  expect(requests[0].client_type).toBe(clientType);
});

}

for (const clientType of ['new_client', 'returning_client']) {
test(`Non demande seulement identité, coordonnées et NAS partiel — ${clientType}`, async ({ page }) => {
  const requests = await intercept(page);
  await page.goto(clientType === 'new_client' ? '/confirmation-client/nouveau' : '/confirm-client/formulaire');
  await page.getByRole('radio', { name: 'Non', exact: true }).check();
  await page.getByRole('button', { name: 'Envoyer ma réponse' }).click();
  expect(requests).toHaveLength(0);
  await expect(page.locator('#person-1-prepared')).toHaveCount(0);
  await expect(page.getByRole('radio', { name: 'Moi seulement' })).toHaveCount(0);
  await page.locator('#first-name').fill('Camille');
  await page.locator('#last-name').fill('Test');
  await page.locator('#phone').fill('514 555-0123');
  await page.locator('#email').fill('camille@example.test');
  await page.locator('#decline-sin').fill('007');
  await page.getByRole('button', { name: 'Envoyer ma réponse' }).click();
  await expect(page).toHaveURL('/confirmation-client/merci');
  await expect(page.getByRole('heading', { name: 'Merci !' })).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({ tax_year: 2026, wants_tax_service: false, first_name: 'Camille', last_name: 'Test', phone: '514 555-0123', email: 'camille@example.test', people_count: 1, yes_data: {}, no_data: { sin_last_three: '007', identification_person_name: 'Camille Test', decline_scope: 'self' }, status: 'completed' });
  expect(requests[0].client_type).toBe(clientType);
});

}

test('échec réseau préserve les champs et permet une nouvelle tentative', async ({ page }) => {
  const requests = await intercept(page, 500);
  await page.goto('/confirmation-client/formulaire');
  await page.getByRole('radio', { name: 'Oui', exact: true }).check();
  await identity(page);
  await page.locator('#single-sin').fill('123');
  await page.getByLabel('Autre situation à signaler', { exact: true }).check();
  await expect(page.locator('#particularity-dependent-person')).toHaveValue('1');
  await page.getByRole('radio', { name: 'Papier', exact: true }).check();
  await page.getByRole('button', { name: 'Envoyer ma réponse' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('#first-name')).toHaveValue('Camille');
  await expect(page).toHaveURL(/\/confirmation-client/);
  await expect(page.getByRole('button', { name: 'Envoyer ma réponse' })).toBeEnabled();
  expect(requests).toHaveLength(1);
  expect(requests[0].yes_data.particularities[0]).toMatchObject({ type: 'dependent', person_id: 1, person_name: 'Camille Test' });
  await page.unroute('**/rest/v1/**');
  await intercept(page);
  await page.getByRole('button', { name: 'Envoyer ma réponse' }).click();
  await expect(page).toHaveURL('/confirmation-client/merci');
});

test('accès direct, validation requise et mise en page mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requests = await intercept(page);
  await page.goto('/confirmation-client/merci');
  await expect(page).toHaveURL(/\/confirmation-client/);
  await page.goto('/confirmation-client/formulaire');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Confirmez votre place' })).toBeVisible();
  await page.getByRole('radio', { name: 'Oui', exact: true }).check();
  await page.getByRole('button', { name: 'Envoyer ma réponse' }).click();
  expect(requests).toHaveLength(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/confirmation-mobile.png', fullPage: true });
});

 test('formulaire public accessible sans invitation', async ({ page }) => {
 await page.goto('/confirm-client/formulaire');
 await expect(page.getByRole('heading', { name: 'Confirmez votre place' })).toBeVisible();
 await expect(page.locator('form')).toHaveCount(1);
 });

for (const path of ['/confirmation-client', '/confirm-client']) {
  test(`choix ancien ou nouveau client depuis ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Ancien client', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Nouveau client', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Je suis déjà client' }).click();
    await expect(page).toHaveURL('/confirmation-client/formulaire');
    await expect(page.getByRole('radio', { name: 'Oui', exact: true })).toBeVisible();
    await page.goBack();
    await page.getByRole('link', { name: 'Je suis nouveau client' }).click();
    await expect(page).toHaveURL('/confirmation-client/nouveau');
    await expect(page.getByRole('radio', { name: 'Oui', exact: true })).toBeVisible();
  });
}
