import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePeople,statusCounts,buildReceipt,receiptEmail,personWarning } from '../../supabase/functions/_shared/confirmationRules.js';
import { scenarios,person } from '../confirmation-fixtures.mjs';
for (const scenario of scenarios) test(scenario.name,()=>{
 const snapshot={wants_tax_service:scenario.wants!==false,people:scenario.people};
 const people=calculatePeople(snapshot.people,snapshot.wants_tax_service);
 assert.deepEqual(people.map(p=>p.calculated_status),scenario.expected);
 const receipt=buildReceipt(snapshot); assert.equal(receipt.variant,scenario.variant);
 assert.ok(receiptEmail(snapshot).text.startsWith(receipt.paragraphs.join('\n\n')));
 assert.equal(Object.values(statusCounts(people)).reduce((a,b)=>a+b,0),scenario.wants===false?0:people.length);
 if(scenario.name.startsWith('5'))assert.ok(receipt.paragraphs.some(p=>p.endsWith('aucune')));
});
test('toutes les relations, réponses absentes et dépendance du conjoint',()=>{
 for(const answer of ['yes','no','unknown','',null]){
  const expected=answer==='yes'?'confirmed':answer==='no'?'review':'verify';
  for(const relation of ['self','child','parent'])assert.equal(calculatePeople([person(relation,answer)])[0].calculated_status,expected);
  assert.equal(calculatePeople([person('other',answer)])[0].calculated_status,answer==='yes'?'confirmed':'verify');
  const people=calculatePeople([person('self',answer),person('spouse','yes')]);assert.equal(people[1].calculated_status,expected);
 }
 assert.equal(personWarning('confirmed'), '');assert.match(personWarning('review',true),/vos impôts/);
 assert.match(personWarning('verify',true),/vos impôts/);
});
test('statuts recalculés après changement sans mutation ni personne fantôme',()=>{
 const source=[person('self','no'),person('spouse','no'),person('child','no')];
 assert.deepEqual(statusCounts(calculatePeople(source)),{confirmed:0,review:3,verify:0});
 source[0].prepared_2025='yes';source.pop();
 assert.deepEqual(statusCounts(calculatePeople(source)),{confirmed:2,review:0,verify:0});
 assert.equal(source[0].calculated_status,undefined);
});
