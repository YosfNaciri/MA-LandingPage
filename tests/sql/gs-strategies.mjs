import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
test('GS migration : historique, accès admin, refus non-admin, statut seul et ingestion conservée',async()=>{
 const db=new PGlite();
 try {
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 grant usage on schema auth to authenticated;
 create table form_submissions(id uuid primary key default gen_random_uuid(),created_at timestamptz not null default now(),form_key text not null,form_name text not null,answers jsonb not null check(jsonb_typeof(answers)='object'));
 alter table form_submissions enable row level security;revoke all on form_submissions from anon,authenticated;grant usage on schema public to service_role;grant insert on form_submissions to service_role;
 insert into form_submissions(form_key,form_name,answers) values('sellerFormFR','Vente','{"prenom":"Test"}');`);
 const migration=readFileSync(new URL('../../supabase/migrations/202611040001_gs_strategies_admin.sql',import.meta.url),'utf8');
 await db.exec(migration);await db.exec(migration);
 async function role(name,claims,sql){await db.exec('begin');try{await db.exec(`set local role ${name}`);await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(claims)]);const result=await db.query(sql);await db.exec('commit');return result;}catch(error){await db.exec('rollback');throw error;}}
 const admin={app_metadata:{role:'admin'}};
 assert.equal((await role('authenticated',admin,'select status from form_submissions')).rows[0].status,'new');
 assert.equal((await role('authenticated',{user_metadata:{role:'admin'}},'select * from form_submissions')).rows.length,0);
 await assert.rejects(role('anon',{},'select * from form_submissions'),/permission denied/);
 assert.equal((await role('authenticated',{},"update form_submissions set status='closed' returning id")).rows.length,0);
 await role('authenticated',admin,"update form_submissions set status='in_progress'");
 await assert.rejects(role('authenticated',admin,"update form_submissions set answers='{}'"),/permission denied/);
 await assert.rejects(role('authenticated',admin,"update form_submissions set status='invalid'"),/check constraint/);
 await role('service_role',{},"insert into form_submissions(form_key,form_name,answers) values('sellerForm','Sale','{}')");
 assert.equal((await role('authenticated',{},'delete from form_submissions returning id')).rows.length,0);
 assert.equal((await role('authenticated',admin,'delete from form_submissions returning id')).rows.length,2);
 } finally { await db.close(); }
});
