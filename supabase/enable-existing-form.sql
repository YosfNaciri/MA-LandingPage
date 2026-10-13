-- Uniquement sur le nouveau projet, pour la table existante tax_year / yes_data / no_data.
begin;
alter table public.client_tax_season_confirmations enable row level security;
revoke all on public.client_tax_season_confirmations from public, anon, authenticated;
grant insert on public.client_tax_season_confirmations to anon, authenticated;
grant select on public.client_tax_season_confirmations to authenticated;
drop policy if exists "Public confirmation submissions" on public.client_tax_season_confirmations;
create policy "Public confirmation submissions" on public.client_tax_season_confirmations
 for insert to anon, authenticated with check (true);
drop policy if exists "Confirmation admin read boundary" on public.client_tax_season_confirmations;
create policy "Confirmation admin read boundary" on public.client_tax_season_confirmations as restrictive
 for select to anon, authenticated using (coalesce((select auth.jwt())->'app_metadata'->>'role','') = 'admin');
drop policy if exists "Confirmation admins can read" on public.client_tax_season_confirmations;
create policy "Confirmation admins can read" on public.client_tax_season_confirmations
 for select to authenticated using (coalesce((select auth.jwt())->'app_metadata'->>'role','') = 'admin');
commit;
