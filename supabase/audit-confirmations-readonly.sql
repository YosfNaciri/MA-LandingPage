-- Lecture seule. Exécuter avant toute migration et conserver le résultat hors dépôt.
select column_name, data_type, is_nullable, column_default from information_schema.columns
where table_schema='public' and table_name='client_tax_season_confirmations' order by ordinal_position;
select policyname, permissive, roles, cmd, qual, with_check from pg_policies
where schemaname='public' and tablename='client_tax_season_confirmations';
select grantee, privilege_type from information_schema.role_table_grants
where table_schema='public' and table_name='client_tax_season_confirmations';
select grantee, column_name, privilege_type from information_schema.column_privileges
where table_schema='public' and table_name='client_tax_season_confirmations';
select tgname, pg_get_triggerdef(oid) from pg_trigger
where tgrelid='public.client_tax_season_confirmations'::regclass and not tgisinternal;
select conname, pg_get_constraintdef(oid) from pg_constraint
where conrelid='public.client_tax_season_confirmations'::regclass;
-- Comptages uniquement, sans noms, courriels ni NAS.
select count(*) as responses, count(*) filter(where jsonb_typeof(people) <> 'array' or people is null) as invalid_arrays,
 count(*) filter(where wants_tax_service is null) as missing_intentions from public.client_tax_season_confirmations;
