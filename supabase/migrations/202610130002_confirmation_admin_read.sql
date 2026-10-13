-- Nouvelle base uniquement, après 001.
begin;
alter table public.client_tax_season_confirmations enable row level security;
grant select on public.client_tax_season_confirmations to authenticated;

-- Cette règle restrictive protège aussi une table ayant déjà une ancienne
-- politique de lecture permissive. Elle ne change pas les règles INSERT.
drop policy if exists "Confirmation admin read boundary" on public.client_tax_season_confirmations;
create policy "Confirmation admin read boundary"
  on public.client_tax_season_confirmations as restrictive
  for select to anon, authenticated
  using ((select auth.role()) = 'authenticated'
    and coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin');

drop policy if exists "Confirmation admins can read" on public.client_tax_season_confirmations;
create policy "Confirmation admins can read"
  on public.client_tax_season_confirmations
  for select to authenticated
  using (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin');
commit;
