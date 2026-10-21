import test from 'node:test';
import assert from 'node:assert/strict';
import { fromConfirmationRecord } from '../../src/lib/clientConfirmations.js';
import { buildConfirmationUpdate, createConfirmationDraft, saveConfirmation } from '../../src/lib/editConfirmation.js';
const raw = {
 id: 'one', tax_year: 2026, first_name: 'Camille', last_name: 'Test', phone: '5145550123', email: 'client@example.test',
 wants_tax_service: true, people_count: 2, created_at: '2026-01-01T00:00:00Z', updated_at:'2026-01-02T00:00:00Z', initial_response_at:'2026-01-01T00:00:00Z', status:'completed',
 people: [{id:1,relation:'self',first_name:'Camille',last_name:'Test',prepared_2025:'yes',extra:'keep'}, {id:2,relation:'child',first_name:'Alex',last_name:'Test',prepared_2025:'no'}],
 yes_data: { custom_answer: 'keep', identification_person_name:'Camille Test',sin_last_three:'007',document_method:'paper', particularities:[{type:'self_employed',person_id:1,person_name:'Camille Test',note:'old',extra:'keep'}]},
 no_data: { old_answer:'preserve' },
};
const fixture = () => {const row=fromConfirmationRecord(structuredClone(raw));return {row,draft:createConfirmationDraft(row)}};
test('Edition : conserve les données cachées et met à jour noms et compteurs',()=>{
 const {row,draft}=fixture();draft.first_name='Renommé';draft.people.push({id:'new',relation:'child',first_name:'Sam',last_name:'Test',prepared_2025:'unknown'});draft.particularities[0].note='nouvelle note';
 const update=buildConfirmationUpdate(row,draft);
 assert.equal(update.people_count,3);assert.equal(update.yes_data.children_count,2);assert.equal(update.yes_data.old_clients_count,1);assert.equal(update.yes_data.to_validate_count,2);
 assert.equal(update.people[0].extra,'keep');assert.equal(update.yes_data.custom_answer,'keep');assert.equal(update.yes_data.particularities[0].extra,'keep');
 assert.equal(update.yes_data.identification_person_name,'Renommé Test');assert.equal(update.yes_data.particularities[0].person_name,'Renommé Test');assert.equal(update.yes_data.sin_last_three,'007');
 for(const key of ['id','created_at','updated_at','initial_response_at','status','wants_tax_service','tax_year','no_data']) assert.ok(!(key in update),key);
 assert.deepEqual(row._record,raw);
});
test('Retrait de personne : exige la correction des références restantes',()=>{
 const {row,draft}=fixture();draft.people=draft.people.slice(1);
 assert.throws(()=>buildConfirmationUpdate(row,draft),/titulaire/);
 draft.identification_person_id='';draft.identification_person_name='';draft.sin_last_three='';
 assert.throws(()=>buildConfirmationUpdate(row,draft),/personne pour chaque particularité/);
 draft.particularities=[];const update=buildConfirmationUpdate(row,draft);assert.equal(update.people_count,1);assert.deepEqual(update.yes_data.particularities,[]);
});
test('Réponse Non : modifie no_data et conserve yes_data',()=>{
 const row=fromConfirmationRecord({...raw,wants_tax_service:false,no_data:{...raw.yes_data,decline_scope:'self'}});const draft=createConfirmationDraft(row);draft.phone='5145559999';
 const update=buildConfirmationUpdate(row,draft);assert.equal(update.no_data.decline_scope,'self');assert.ok(!('yes_data' in update));assert.equal(update.phone,'5145559999');
});
test('Validation NAS partiel, email et particularités exclusives',()=>{
 const {row,draft}=fixture();draft.sin_last_three='123456789';assert.throws(()=>buildConfirmationUpdate(row,draft),/trois chiffres/);
 draft.sin_last_three='007';draft.email='invalid';assert.throws(()=>buildConfirmationUpdate(row,draft),/courriel/);
 draft.no_email=true;draft.particularities.push({type:'none',note:''});assert.throws(()=>buildConfirmationUpdate(row,draft),/ne peuvent pas/);
});
test('Sauvegarde filtrée par identifiant et version ; conflits et refus conservés',async()=>{
 const {row,draft}=fixture();const calls=[];
 const clientFor=result=>({from(table){calls.push(table);return {update(payload){calls.push(payload);return this},eq(key,value){calls.push([key,value]);return this},is(key,value){calls.push([key,value]);return this},select(){return Promise.resolve(result)}}}});
 const saved=await saveConfirmation(clientFor({data:[{...raw,updated_at:'2026-01-03T00:00:00Z'}]}),'table',row,draft);
 assert.equal(saved.updated_at,'2026-01-03T00:00:00Z');assert.deepEqual(calls.slice(2,4),[['id','one'],['updated_at',raw.updated_at]]);
 await assert.rejects(saveConfirmation(clientFor({data:[]}),'table',row,draft),/a changé/);
 await assert.rejects(saveConfirmation(clientFor({error:{code:'42501'}}),'table',row,draft),/droits UPDATE/);
});
