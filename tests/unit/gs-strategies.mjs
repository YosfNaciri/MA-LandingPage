import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGsSubmission, filterGsRows, gsCsv } from '../../src/lib/gsSubmissionData.js';
import { loadGsRows } from '../../src/lib/gsStrategies.js';
const record = { id:'11111111-1111-1111-1111-111111111111', created_at:'2026-11-04T10:00:00Z', form_key:'sellerFormFR', form_name:'Vente', status:'new', answers:{ prenom:{label:'Prénom',value:'Élodie'}, nom:'Test', courriel:'test@example.test', nom_cabinet:'Cabinet Test', prix:{label:'Prix souhaité',value:250000}, services:['Comptabilité','Conseil'], consent:false, html_intro:{type:'html',value:'Titre'}, password:{type:'password',value:'private'}, special:{label:'Précision',section:'Ma section',value:'Texte\nSuite'} } };
test('GS JSON : formats directs et label/value, sections, champs cachés et booleans',()=>{
 const row=normalizeGsSubmission(record);
 assert.equal(row.seller_name,'Élodie Test');assert.equal(row.language,'fr');assert.equal(row.company_name,'Cabinet Test');
 assert.equal(row.fields.services,'Comptabilité, Conseil');assert.equal(row.fields.consent,'Non');assert.ok(!('password' in row.fields));assert.ok(!('html_intro' in row.fields));
 assert.equal(row.groups.find(group=>group.title==='Ma section').answers[0].value,'Texte\nSuite');
 assert.equal(normalizeGsSubmission({...record,form_key:'other',form_name:'Autre'}).language,'');
});
test('GS recherche et export : accents, réponses, langue, colonnes variables, formules',()=>{
 const rows=[normalizeGsSubmission(record),normalizeGsSubmission({...record,id:'other',form_key:'sellerForm',answers:{first_name:'Alex',message:'\t=1+1'}})];
 assert.equal(filterGsRows(rows,{search:'elodie',language:'fr'}).length,1);
 assert.equal(filterGsRows(rows,{search:'250000'}).length,1);
 assert.equal(filterGsRows(rows,{language:'en'}).length,1);
 const csv=gsCsv(rows);assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('Champ : message'));assert.ok(csv.includes("'\t=1+1"));assert.ok(!csv.includes('private'));
});
test('GS pagination : respecte les plafonds serveur et conserve tous les UUID',async()=>{
 const records=[{...record,id:'a'},{...record,id:'b'},{...record,id:'c'}];
 let queries=0;
 const client={from(){let upper=false,after='';return {select(columns){upper=columns==='id';return this},order(){return this},lte(){return this},gt(k,value){after=value;return this},limit(){return this},then(resolve){queries++;return Promise.resolve({data:upper?[{id:'c'}]:records.filter(row=>row.id>after).slice(0,1),error:null}).then(resolve)}}}};
 assert.equal((await loadGsRows(client)).length,3);assert.equal(queries,4);
});

test('GS fiche : rôle, nom unique, date sans heure et critères du cabinet', async()=>{
 const { gsDate, gsFilterOptions } = await import('../../src/lib/gsSubmissionData.js');
 const row=normalizeGsSubmission({...record,answers:{...record.answers,role:{label:'Votre rôle',value:'Associée'},province_cabinet:'Québec',ville_cabinet:'Montréal',delai_vente:'6 à 12 mois',prix_vente:'500 000 $'}});
 assert.equal(row.role,'Associée');assert.equal(row.province,'Québec');assert.equal(row.city,'Montréal');assert.equal(row.sale_delay,'6 à 12 mois');
 assert.ok(row.groups.every(group=>group.answers.every(answer=>!['prenom','nom'].includes(answer.id))));
 assert.equal(row.fields.prenom,'Élodie'); // CSV retains original identity answers.
 assert.ok(!gsDate(row.created_at).includes(':'));assert.equal(gsDate(null),'—');
 assert.equal(filterGsRows([row],{province:'Quebec',city:'Montreal',sale_delay:'6 à 12 mois',price:'from500'}).length,1);
 assert.equal(filterGsRows([row],{price:'from250'}).length,0);
 assert.deepEqual(gsFilterOptions([row,row]).province,['Québec']);
});
test('GS prix : montants, fourchettes, milliers/millions et valeurs inconnues', async()=>{
 const { priceBounds } = await import('../../src/lib/gsSubmissionData.js');
 assert.equal(priceBounds('1 500 000 $').min,1500000);
 assert.equal(priceBounds('$1,500,000').min,1500000);
 assert.equal(priceBounds('1,5 M$').min,1500000);
 assert.deepEqual(priceBounds('250 à 500 k$'),{min:250000,max:500000,interval:true});
 assert.equal(priceBounds('2 millions et plus').max,Infinity);
 assert.equal(priceBounds('À discuter'),null);
 const row=normalizeGsSubmission({...record,answers:{prix_vente:'250 000 à 750 000 $'}});
 assert.equal(filterGsRows([row],{price:'from250'}).length,1);assert.equal(filterGsRows([row],{price:'from500'}).length,1);
 assert.equal(filterGsRows([row],{price:'under250'}).length,0);
});
