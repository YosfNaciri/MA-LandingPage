import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { scenarios,person } from '../confirmation-fixtures.mjs';
import { buildReceipt } from '../../supabase/functions/_shared/confirmationRules.js';

// Disposable PostgreSQL engine. This fixture describes the app's current
// contract, NOT an assertion about the remote database.
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth;
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
create function auth.uid() returns uuid language sql stable as $$select nullif(auth.jwt()->>'sub','')::uuid$$;
grant usage on schema public,auth to anon,authenticated,service_role;
grant execute on all functions in schema auth to anon,authenticated,service_role;
create table public.client_tax_season_confirmations(
 id uuid primary key default gen_random_uuid(),created_at timestamptz default now(),updated_at timestamptz default now(),
 tax_year integer not null,first_name text not null,last_name text not null,email text,phone text,
 wants_tax_service boolean,people jsonb not null,people_count integer,yes_data jsonb,no_data jsonb,
 initial_response_at timestamptz,status text,client_type text not null default 'returning_client');
alter table public.client_tax_season_confirmations enable row level security;
grant insert on public.client_tax_season_confirmations to anon,authenticated;
grant select,delete on public.client_tax_season_confirmations to authenticated;
create policy submit on public.client_tax_season_confirmations for insert to anon,authenticated with check(true);
create policy admin_read on public.client_tax_season_confirmations for select to authenticated using(auth.jwt()->'app_metadata'->>'role'='admin');
create policy admin_delete on public.client_tax_season_confirmations for delete to authenticated using(auth.jwt()->'app_metadata'->>'role'='admin');
`);
await db.exec(readFileSync(new URL('../../supabase/migrations/202610210001_admin_update_confirmations.sql',import.meta.url),'utf8'));
const legacyPeople=[person('self','yes','1'),person('child','no','2')];
await db.query(`insert into client_tax_season_confirmations(id,tax_year,first_name,last_name,people,wants_tax_service,yes_data,no_data,phone,email)
 values('11111111-1111-1111-1111-111111111111',2026,'Legacy','Test',$1,true,'{}','{}','5145550100','legacy@example.test')`,[JSON.stringify(legacyPeople)]);
const legacyBefore=(await db.query('select * from client_tax_season_confirmations')).rows[0];
await db.exec(readFileSync(new URL('../../supabase/migrations/202610260001_confirmation_people.sql',import.meta.url),'utf8'));
await db.exec(readFileSync(new URL('../../supabase/migrations/202610260002_confirmation_receipts.sql',import.meta.url),'utf8'));
await db.exec(readFileSync(new URL('../../supabase/migrations/202610290001_confirmation_receipts_brevo.sql',import.meta.url),'utf8'));
async function role(roleName, claims, fn){
 await db.exec('begin');
 try{await db.exec(`set local role ${roleName}`);await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(claims)]);const result=await fn();await db.exec('commit');return result;}
 catch(error){await db.exec('rollback');throw error;}
}
const admin={sub:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',app_metadata:{role:'admin'}};
const makeRecord=s=>({tax_year:2026,first_name:'Client',last_name:'Test',phone:'5145550100',email:s.noEmail?null:'client@example.test',client_type:'new_client',wants_tax_service:s.wants!==false,people:s.people,yes_data:{no_email:!!s.noEmail,particularities:[]},no_data:{no_email:!!s.noEmail}});
async function submit(record,key=crypto.randomUUID()) {return (await role('anon',{},()=>db.query('select submit_tax_confirmation($1,$2) as value',[JSON.stringify(record),key]))).rows[0].value;}
await test('Migrations et contrats PostgreSQL',async t=>{
 await t.test('Reprise historique sans modifier la réponse, sans doubles et sans envoi',async()=>{
  const after=(await db.query('select * from client_tax_season_confirmations where id=$1',[legacyBefore.id])).rows[0];
  for(const key of Object.keys(legacyBefore))assert.deepEqual(after[key],legacyBefore[key]);
  const before=(await db.query('select id,source_data from client_confirmation_people order by person_key')).rows;
  assert.equal(before.length,2);
  // Replaying the projection operation preserves row ids and does not duplicate.
  await db.query('update client_tax_season_confirmations set people=people where id=$1',[legacyBefore.id]);
  const afterPeople=(await db.query('select id,source_data from client_confirmation_people order by person_key')).rows;
  assert.deepEqual(afterPeople,before);
  assert.equal((await db.query('select state from confirmation_receipts')).rows[0].state,'skipped_legacy');
 });
 for(const scenario of scenarios) await t.test(scenario.name+' : serveur, personnes et accusé atomiques',async()=>{
  const result=await submit(makeRecord(scenario));
  const people=(await db.query('select calculated_status from client_confirmation_people where response_id=$1 order by position',[result.id])).rows;
  assert.deepEqual(people.map(p=>p.calculated_status),scenario.wants===false?[]:scenario.expected);
  const receipt=(await db.query('select variant,state from confirmation_receipts where response_id=$1',[result.id])).rows[0];
  assert.equal(receipt.variant,scenario.variant);assert.equal(buildReceipt(result.receipt_snapshot).variant,receipt.variant);
  assert.equal(receipt.state,scenario.noEmail?'skipped_no_email':'queued');
 });
 await t.test('Token idempotent : aucun doublon, aucun double accusé',async()=>{
  const record=makeRecord(scenarios[2]);const key=crypto.randomUUID();
  const one=await submit(record,key);const two=await submit(record,key);assert.equal(one.id,two.id);
  assert.equal((await db.query('select count(*)::int as n from confirmation_receipts where response_id=$1',[one.id])).rows[0].n,1);
  await assert.rejects(submit({...record,first_name:'Changed'},key));
 });
 await t.test('Statuts forgés ignorés, absence jamais confirmée, données invalides atomiquement rejetées',async()=>{
  const result=await submit(makeRecord({people:[{...person('self',''),calculated_status:'confirmed'}]}));
  assert.equal(result.receipt_snapshot.people[0].calculated_status,'verify');
  const before=(await db.query('select count(*)::int n from client_tax_season_confirmations')).rows[0].n;
  await assert.rejects(submit(makeRecord({people:[person('self','yes'),person('self','yes','duplicate')]})));
  await assert.rejects(submit({...makeRecord(scenarios[0]),phone:'bad'}));
  const after=(await db.query('select count(*)::int n from client_tax_season_confirmations')).rows[0].n;assert.equal(before,after);
 });
 await t.test('Droits : aucun accès public ni utilisateur simple, décisions réservées aux admins',async()=>{
  await assert.rejects(role('anon',{},()=>db.query('select * from client_confirmation_people')));
  await assert.rejects(role('anon',{},()=>db.query('select * from confirmation_receipts')));
  const rows=await role('authenticated',{user_metadata:{role:'admin'}},()=>db.query('select * from client_confirmation_people'));assert.equal(rows.rows.length,0);
  const forged=await role('authenticated',{},()=>db.query("update client_confirmation_people set cabinet_decision='Accepté' returning id"));assert.equal(forged.rows.length,0);
  await assert.rejects(role('authenticated',admin,()=>db.query("update client_confirmation_people set calculated_status='confirmed'")));
  await assert.rejects(role('anon',{},()=>db.query('select * from claim_confirmation_receipt()')));
  await assert.rejects(role('authenticated',{},()=>db.query('select retry_confirmation_receipt($1)',[legacyBefore.id])));
 });
 await t.test('Édition : conjoint recalculé, décisions séparées conservées, suppression sans fantôme et conflits',async()=>{
  const result=await submit(makeRecord(scenarios[4]));
  const personRow=(await db.query('select * from client_confirmation_people where response_id=$1 order by position',[result.id])).rows[1];
  const decision=(await role('authenticated',admin,()=>db.query("update client_confirmation_people set cabinet_decision='Accepté',cabinet_response_sent=true where id=$1 and version=$2 returning *",[personRow.id,personRow.version]))).rows[0];
  assert.equal(decision.calculated_status,'review');assert.ok(decision.decision_at);assert.ok(decision.cabinet_response_sent_at);
  assert.equal((await role('authenticated',admin,()=>db.query("update client_confirmation_people set cabinet_decision='Refusé' where id=$1 and version=$2 returning id",[personRow.id,personRow.version]))).rows.length,0);
  const parent=(await db.query('select * from client_tax_season_confirmations where id=$1',[result.id])).rows[0];
  const people=parent.people.map(p=>p.relation==='self'?{...p,prepared_2025:'yes'}:p);
  await role('authenticated',admin,()=>db.query('update client_tax_season_confirmations set people=$1 where id=$2 and updated_at=$3 returning id',[JSON.stringify(people),parent.id,parent.updated_at]));
  const spouse=(await db.query('select * from client_confirmation_people where id=$1',[personRow.id])).rows[0];
  assert.equal(spouse.calculated_status,'confirmed');assert.equal(spouse.cabinet_decision,'Accepté');assert.equal(spouse.prepared_2025,'yes');
  assert.equal((await role('authenticated',admin,()=>db.query('update client_tax_season_confirmations set people=$1 where id=$2 and updated_at=$3 returning id',[JSON.stringify(people),parent.id,parent.updated_at]))).rows.length,0);
  await role('authenticated',admin,()=>db.query('update client_tax_season_confirmations set people=$1 where id=$2',[JSON.stringify(people.slice(0,1)),parent.id]));
  assert.equal((await db.query('select count(*)::int n from client_confirmation_people where response_id=$1',[parent.id])).rows[0].n,1);
  // Snapshot is immutable: admin edits do not send a different second receipt.
  assert.equal((await db.query('select variant from confirmation_receipts where response_id=$1',[parent.id])).rows[0].variant,'B');
  await role('authenticated',admin,()=>db.query('delete from client_tax_season_confirmations where id=$1',[parent.id]));
  assert.equal((await db.query('select count(*)::int n from client_confirmation_people where response_id=$1',[parent.id])).rows[0].n,0);
  assert.equal((await db.query('select count(*)::int n from confirmation_receipts where response_id=$1',[parent.id])).rows[0].n,0);
 });
 await t.test('Transition Brevo : ancien payload bloqué, accusé envoyé préservé',async()=>{
  const result=await submit(makeRecord(scenarios[0]));
  await db.query("update confirmation_receipts set state='failed',delivery_payload='{\"from\":\"old@example.test\",\"text\":\"old\"}' where response_id=$1",[result.id]);
  const sent=await submit(makeRecord(scenarios[0]));
  await db.query("update confirmation_receipts set state='sent',delivery_payload='{\"from\":\"old@example.test\"}' where response_id=$1",[sent.id]);
  await db.exec(readFileSync(new URL('../../supabase/migrations/202610290001_confirmation_receipts_brevo.sql',import.meta.url),'utf8'));
  assert.equal((await db.query('select state from confirmation_receipts where response_id=$1',[result.id])).rows[0].state,'manual_review');
  assert.equal((await db.query('select state from confirmation_receipts where response_id=$1',[sent.id])).rows[0].state,'sent');
 });
 await t.test('File : lease exclusif, échec et reprise, fenêtre anti-doublon',async()=>{
  const job=(await role('service_role',{},()=>db.query('select * from claim_confirmation_receipt()'))).rows[0];assert.ok(job.lease_token);
  const next=(await role('service_role',{},()=>db.query('select * from claim_confirmation_receipt()'))).rows[0];assert.notEqual(job.response_id,next.response_id);
  await role('service_role',{},()=>db.query("select finish_confirmation_receipt($1,$2,null,'delivery_uncertain')",[job.response_id,job.lease_token]));
  assert.equal((await db.query('select state from confirmation_receipts where response_id=$1',[job.response_id])).rows[0].state,'failed');
  assert.equal((await role('authenticated',admin,()=>db.query('select retry_confirmation_receipt($1) ok',[job.response_id]))).rows[0].ok,true);
  await db.query("update confirmation_receipts set first_attempt_at=now()-interval '25 hours' where response_id=$1",[job.response_id]);
  await role('service_role',{},()=>db.query('select * from claim_confirmation_receipt()'));
  assert.equal((await db.query('select state from confirmation_receipts where response_id=$1',[job.response_id])).rows[0].state,'manual_review');
  assert.equal((await role('authenticated',admin,()=>db.query('select retry_confirmation_receipt($1) ok',[job.response_id]))).rows[0].ok,false);
 });
});
await db.close();
