-- Nouveau projet uniquement. Autorise la suppression aux seuls administrateurs.
begin;
alter table public.client_tax_season_confirmations enable row level security;
revoke delete on public.client_tax_season_confirmations from public, anon;
grant delete on public.client_tax_season_confirmations to authenticated;
drop policy if exists "Confirmation admin delete boundary" on public.client_tax_season_confirmations;
create policy "Confirmation admin delete boundary" on public.client_tax_season_confirmations as restrictive
 for delete to anon, authenticated
 using (coalesce((select auth.jwt())->'app_metadata'->>'role','') = 'admin');
drop policy if exists "Confirmation admins can delete" on public.client_tax_season_confirmations;
create policy "Confirmation admins can delete" on public.client_tax_season_confirmations
 for delete to authenticated
 using (coalesce((select auth.jwt())->'app_metadata'->>'role','') = 'admin');
-- Les droits SELECT admin configurés par 006 sont aussi nécessaires pour DELETE.
commit;
