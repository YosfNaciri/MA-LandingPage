import test from 'node:test';
import assert from 'node:assert/strict';
import { receiptEmail } from '../../supabase/functions/_shared/confirmationRules.js';
import { escapeEmailHtml } from '../../supabase/functions/_shared/receiptTemplate.js';
import { scenarios } from '../confirmation-fixtures.mjs';
for (const scenario of [scenarios[0],scenarios[2],scenarios[8]]) test(`HTML ${scenario.variant} : textes prescrits présents et aucun chargement externe`,()=>{
 const receipt=receiptEmail({wants_tax_service:scenario.wants!==false,people:scenario.people});
 for(const paragraph of receipt.paragraphs){
  const fragments=paragraph.includes(' : ')?paragraph.split(' : '):[paragraph];
  for(const fragment of fragments)assert.ok(receipt.html.includes(escapeEmailHtml(fragment)));
 }
 assert.ok(receipt.html.includes('lang="fr-CA"'));
 assert.doesNotMatch(receipt.html,/<script|<img|<link|<form/i);
});
test('HTML : noms et nom du cabinet ne peuvent injecter de balises',()=>{
 const receipt=receiptEmail({wants_tax_service:true,people:[{relation:'self',prepared_2025:'yes',first_name:'<img src=x onerror=alert(1)>',last_name:'A & B'}]},'<script>cabinet</script>');
 assert.doesNotMatch(receipt.html,/<img|<script/i);
 assert.ok(receipt.html.includes('&lt;img'));
 assert.ok(receipt.html.includes('A &amp; B'));
});
