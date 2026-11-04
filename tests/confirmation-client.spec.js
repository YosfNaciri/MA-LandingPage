import { calculatePeople, buildReceipt, statusCounts } from "../supabase/functions/_shared/confirmationRules.js";
import { scenarios } from "./confirmation-fixtures.mjs";
import { test, expect } from '@playwright/test';

async function identity(page) {
  await page.locator('#first-name').fill('Camille');
  await page.locator('#last-name').fill('Test');
  if (!page.url().includes('/nouveau')) await page.locator('#person-1-prepared').selectOption('yes');
  else { await expect(page.locator('#person-1-prepared')).toHaveValue('no'); await expect(page.locator('#person-1-prepared')).toBeDisabled(); }
  await page.locator('#phone').fill('514 555-0123');
  await page.locator('#email').fill('camille@example.test');
}

async function intercept(page, status = 201) {
  const requests = [];
  await page.route('**/rest/v1/**', async route => {
    expect(new URL(route.request().url()).pathname).toBe('/rest/v1/rpc/submit_tax_confirmation');
    const {p_record, p_request_id} = route.request().postDataJSON();
    expect(p_request_id).toMatch(/^[0-9a-f-]{36}$/);
    requests.push(p_record);
    await route.fulfill({ status: status === 201 ? 200 : status, json: status === 201
      ? {id:'submitted',receipt_snapshot:{wants_tax_service:p_record.wants_tax_service,people:calculatePeople(p_record.people,p_record.wants_tax_service)}}
      : {message:'Test failure'} });
  });
  return requests;
}

for (const clientType of ['new_client', 'returning_client']) {
test(`acceptation, famille, particularités et payload compatible — ${clientType}`, async ({ page }) => {
  const requests = await intercept(page);
  await page.goto(clientType === 'new_client' ? '/confirmation-client/nouveau' : '/confirmation-client/formulaire');
  if (!page.url().includes('/nouveau')) await page.getByRole('radio', { name: 'Oui', exact: true }).check();
  await identity(page);
  await expect(page.locator('#person-1-prepared option[value="yes"]')).toHaveCount(clientType === 'new_client' ? 0 : 1);
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
  expect(requests[0]).toMatchObject({ tax_year: 2026, first_name: 'Camille', last_name: 'Test', wants_tax_service: true, people_count: 3, status: 'completed', no_data: {}, yes_data: { old_clients_count: clientType === 'new_client' ? 0 : 2, to_validate_count: clientType === 'new_client' ? 3 : 1, is_couple: true, children_count: 1, sin_last_three: '123', identification_person_name: 'Alex Test', document_method: 'electronic' } });
  expect(requests[0]).not.toHaveProperty('tax_season');
  expect(requests[0].people[2]).toMatchObject({ relation: 'child', sin_unknown: true, sin_last_three: null });
  expect(requests[0].yes_data.particularities[0]).toMatchObject({ type: 'self_employed', person_id: 2 });
  expect(requests[0].client_type).toBe(clientType);
});

}

for (const clientType of ['returning_client']) {
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
  if (!page.url().includes('/nouveau')) await page.getByRole('radio', { name: 'Oui', exact: true }).check();
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
  await expect(page.getByRole('heading', { name: 'Confirmez votre intention' })).toBeVisible();
  if (!page.url().includes('/nouveau')) await page.getByRole('radio', { name: 'Oui', exact: true }).check();
  await page.getByRole('button', { name: 'Envoyer ma réponse' }).click();
  expect(requests).toHaveLength(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/confirmation-mobile.png', fullPage: true });
});

 test('formulaire public accessible sans invitation', async ({ page }) => {
 await page.goto('/confirm-client/formulaire');
 await expect(page.getByRole('heading', { name: 'Confirmez votre intention' })).toBeVisible();
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
    await expect(page.getByRole('radio', { name: 'Oui', exact: true })).toHaveCount(0);
    await expect(page.locator('#first-name')).toBeVisible();
    await expect(page.locator('#person-1-prepared')).toBeDisabled();
    await expect(page.locator('#person-1-prepared')).toHaveValue('no');
  });
}

for (const scenario of scenarios.filter(s=>s.wants!==false)) {
 test(`Document — ${scenario.name} : écran, récapitulatif et succès`,async({page})=>{
  const requests=await intercept(page);
  await page.goto(scenario.people[0].prepared_2025 === 'yes' ? '/confirmation-client/formulaire' : '/confirmation-client/nouveau');
  if (!page.url().includes('/nouveau')) await page.getByRole('radio',{name:'Oui',exact:true}).check();
  await identity(page);
  if (!page.url().includes('/nouveau')) await page.locator('#person-1-prepared').selectOption(scenario.people[0].prepared_2025);
  for(let index=1;index<scenario.people.length;index++){
   const p=scenario.people[index];const id=index+1;
   const label={spouse:'Ajouter un conjoint',child:'Ajouter un enfant',parent:'Ajouter un parent'}[p.relation];
   await page.getByRole('button',{name:label,exact:true}).click();
   await page.locator(`#person-${id}-first-name`).fill(p.first_name);
   await page.locator(`#person-${id}-last-name`).fill(p.last_name);
   await page.locator(`#person-${id}-prepared`).selectOption(scenario.name.startsWith('6')?'no':p.prepared_2025);
   await expect(page.locator(`#person-${id}-relation option[value="self"]`)).toHaveCount(0);
  }
  if(scenario.name.startsWith('6')){
   await expect(page.getByText(/Nouvelle demande, à confirmer/)).toBeVisible();
   await page.locator('#person-2-prepared').selectOption('yes');
   await expect(page.getByText(/Nouvelle demande, à confirmer/)).toHaveCount(0);
  }
  if(scenario.name.startsWith('7')){
   await page.getByRole('button',{name:'Ajouter un enfant',exact:true}).click();
   await page.locator('#person-2-first-name').fill('Retirée');
   await page.locator('#person-2-prepared').selectOption('no');
   await page.getByRole('button',{name:'Retirer',exact:true}).click();
   await expect(page.locator('#person-2-first-name')).toHaveCount(0);
  }
  const hasSpouse=scenario.people.some(p=>p.relation==='spouse');
  await page.locator(hasSpouse?'#couple-sin':'#single-sin').fill('123');
  await page.getByRole('radio',{name:'Papier',exact:true}).check();
  if(scenario.noEmail)await page.getByLabel('Je n’ai pas de courriel',{exact:true}).check();
  const counts=statusCounts(calculatePeople(scenario.people));
  const recap=page.getByRole('heading',{name:'Vérification avant envoi'}).locator('..');
  await expect(recap).toContainText(`Places confirmées : ${counts.confirmed} · Demandes à évaluer : ${counts.review} · À vérifier : ${counts.verify}`);
  if(scenario.variant==='A')await expect(page.getByText(/Nous vérifierons si|Nouvelle demande, à confirmer/)).toHaveCount(0);
  await page.getByRole('button',{name:'Envoyer ma réponse',exact:true}).click();
  await expect(page).toHaveURL('/confirmation-client/merci');
  const receipt=buildReceipt({wants_tax_service:true,people:requests[0].people});
  for(const paragraph of receipt.paragraphs)await expect(page.getByText(paragraph,{exact:true})).toBeVisible();
  expect(requests[0].people).toHaveLength(scenario.people.length);
  if(scenario.noEmail)expect(requests[0].email).toBeNull();
 });
}

test('Non sans courriel : réponse enregistrée et message Non',async({page})=>{
 const requests=await intercept(page);await page.goto('/confirmation-client/formulaire');
 await page.getByRole('radio',{name:'Non',exact:true}).check();
 await page.locator('#first-name').fill('Sans');await page.locator('#last-name').fill('Courriel');
 await page.locator('#phone').fill('5145550100');await page.locator('#decline-sin').fill('007');
 await page.getByLabel('Je n’ai pas de courriel',{exact:true}).check();
 await page.getByRole('button',{name:'Envoyer ma réponse'}).click();
 await expect(page).toHaveURL('/confirmation-client/merci');
 expect(requests[0].email).toBeNull();expect(requests[0].no_data.no_email).toBe(true);
 await expect(page.getByText(/Nous retirerons votre dossier/)).toBeVisible();
});

for(const width of [375,412])test(`10 Mobile ${width}px : avertissements et récapitulatif`,async({page},testInfo)=>{
 await page.setViewportSize({width,height:844});await intercept(page);await page.goto('/confirmation-client/nouveau');
 if (!page.url().includes('/nouveau')) await page.getByRole('radio',{name:'Oui',exact:true}).check();await identity(page);
 await expect(page.locator('#person-1-prepared')).toHaveValue('no');
 await page.getByRole('button',{name:'Ajouter un conjoint'}).click();
 await page.locator('#person-2-first-name').fill('Conjoint');await page.locator('#person-2-last-name').fill('Test');
 await page.locator('#person-2-prepared').selectOption('yes');
 await expect(page.getByText(/Nous n'avons pas préparé vos impôts/)).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:testInfo.outputPath('formulaire-mobile.png'),fullPage:true});
});
