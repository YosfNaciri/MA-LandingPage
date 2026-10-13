-- Nouveau projet uniquement : accès administrateur au schéma tax_year / yes_data / no_data.
-- Ne crée ni ne modifie les réponses. Compatible avec la table déjà créée.
begin;
alter table public.client_tax_season_confirmations enable row level security;
revoke select, update, delete, truncate, references, trigger on public.client_tax_season_confirmations from public, anon, authenticated;
grant select on public.client_tax_season_confirmations to authenticated;
drop policy if exists "Confirmation admin read boundary" on public.client_tax_season_confirmations;
create policy "Confirmation admin read boundary" on public.client_tax_season_confirmations as restrictive
 for select to anon, authenticated
 using (coalesce((select auth.jwt())->'app_metadata'->>'role','') = 'admin');
drop policy if exists "Confirmation admins can read" on public.client_tax_season_confirmations;
create policy "Confirmation admins can read" on public.client_tax_season_confirmations
 for select to authenticated
 using (coalesce((select auth.jwt())->'app_metadata'->>'role','') = 'admin');
commit;
