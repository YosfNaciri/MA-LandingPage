-- NOUVEAU projet uniquement : autoriser l’envoi direct du formulaire.
begin;
alter table public.client_tax_season_confirmations enable row level security;
grant insert on public.client_tax_season_confirmations to anon, authenticated;
drop policy if exists "Public confirmation submissions" on public.client_tax_season_confirmations;
create policy "Public confirmation submissions" on public.client_tax_season_confirmations
 for insert to anon, authenticated with check (true);
-- Aucun droit de lecture ajouté. Les politiques administrateur restent en place.
commit;
