import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteConfirmation, fromConfirmationRecord, confirmationExportRow, createConfirmationsCsv, loadAllConfirmations, confirmationColumns, formatConfirmationDate } from '../../src/lib/clientConfirmations.js';
const row = { id: 'one', tax_year: 2026, first_name: 'Camille', last_name: 'Test', wants_tax_service: true, people_count: 2, people: [{first_name:'Camille',relation:'self',prepared_2025:'yes'}, {first_name:'Alex',relation:'child',prepared_2025:'no'}], phone:'0123456789', yes_data:{sin_last_three:'007', particularities:[{type:'dependent',note:'=1+1'}],document_method:'paper'}, no_data:{decline_scope:'all',sin_last_three:'999'}, status:'completed', created_at:'2026-10-13T12:00:00Z' };
test('Oui : détails, personnes, zéros et statut dans les exports', () => {
 const value=fromConfirmationRecord(row);const exported=confirmationExportRow(value);
 assert.equal(value.sin_last_three,'007');assert.equal(value.old_clients_count,1);assert.equal(value.children_count,1);assert.equal(value.to_validate_count,1);
 assert.equal(exported['NAS (3 derniers chiffres)'],'007');assert.equal(exported['Téléphone'],'0123456789');assert.equal(exported.Statut,'Terminée');assert.equal(value.decline_scope,'');
});
test('Non : utilise seulement no_data et conserve la portée du refus', () => {
 const value=fromConfirmationRecord({...row,wants_tax_service:false,no_data:{decline_scope:'couple',sin_last_three:'009'}});
 assert.equal(value.sin_last_three,'009');assert.equal(value.decline_scope,'couple');assert.deepEqual(value.particularities,[]);assert.equal(value.document_method,'not_applicable');
});
test('Valeurs SQL nulles et JSON irrégulier ne font pas tomber le tableau', () => {
 const value=fromConfirmationRecord({...row,wants_tax_service:null,first_name:null,people:[null,1,[],{first_name:{bad:true}}],people_count:null,yes_data:[],no_data:'text',status:null});
 assert.equal(value.wants_tax_service,null);assert.equal(value.people.length,1);assert.equal(value.people[0].first_name,'');assert.equal(confirmationExportRow(value)['Prise en charge demandée'],'Non renseignée');
 assert.equal(formatConfirmationDate(null),'—');assert.equal(formatConfirmationDate('bad'),'—');
 const invalid=fromConfirmationRecord({...row,yes_data:{particularities:{bad:true},sin_last_three:null}});
 assert.deepEqual(invalid.particularities,[]);assert.equal(confirmationExportRow(invalid)['NAS (3 derniers chiffres)'],'');
});
test('Lecture paginée du vrai schéma, export sans limitation à la première page', async () => {
 const offsets=[];let page=0;
 const client={from(table){assert.equal(table,'client_tax_season_confirmations');return {select(columns){assert.equal(columns,confirmationColumns);assert.ok(!columns.split(',').includes('tax_season'));return this},order(){return this},range(start){offsets.push(start);return Promise.resolve({data:page++<2?[{...row,id:String(page)}]:[],error:null})}}}};
 const rows=await loadAllConfirmations(client,'client_tax_season_confirmations');assert.equal(rows.length,2);assert.deepEqual(offsets,[0,1,2]);assert.equal(rows[0].tax_season,'2026');
});
test('Lecture refusée et annulation sont transmises au tableau', async () => {
 const failure=new Error('denied');const query={select(){return this},order(){return this},range(){return Promise.resolve({error:failure})}};
 await assert.rejects(loadAllConfirmations({from:()=>query},'table'),/denied/);
 const controller=new AbortController();controller.abort();await assert.rejects(loadAllConfirmations({from(){throw new Error('must not query')}},'table',controller.signal),{name:'AbortError'});
});
test('CSV neutralise les formules saisies par un client', () => {
 const csv=createConfirmationsCsv([{name:'=1+1',phone:'+123',note:'texte "cité"'}]);assert.ok(csv.includes("'=1+1"));assert.ok(csv.includes("'+123"));assert.ok(csv.includes('""cité""'));
});


test('Suppression ciblée : vérifie le filtre et la réponse du serveur', async () => {
 const calls=[];
 const client={from(table){calls.push(table);return {delete(){calls.push('delete');return this},eq(column,id){calls.push([column,id]);return this},select(column){calls.push(column);return Promise.resolve({data:[{id:'target'}],error:null})}}}};
 await deleteConfirmation(client,'client_tax_season_confirmations','target');
 assert.deepEqual(calls,['client_tax_season_confirmations','delete',['id','target'],'id']);
});
test('Suppression refusée ou sans ligne : ne pas annoncer un succès', async () => {
 const clientFor=result=>({from(){return {delete(){return this},eq(){return this},select(){return Promise.resolve(result)}}}});
 await assert.rejects(deleteConfirmation(clientFor({error:new Error('denied')}),'table','target'),/denied/);
 await assert.rejects(deleteConfirmation(clientFor({data:[]}), 'table','target'),/Aucune confirmation/);
 await assert.rejects(deleteConfirmation(clientFor({data:[{id:'other'}]}), 'table','target'),/Aucune confirmation/);
 await assert.rejects(deleteConfirmation({},'table',''),/invalide/);
});
