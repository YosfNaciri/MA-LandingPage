-- Base actuelle : origine du formulaire de confirmation commun.
-- Les réponses existantes venaient du parcours ancien client.
begin;
alter table public.client_tax_season_confirmations
  add column client_type text not null default 'returning_client'
  check (client_type in ('new_client', 'returning_client'));
create index confirmations_client_type_created
  on public.client_tax_season_confirmations(client_type, created_at desc);
-- Les droits INSERT/SELECT et les politiques RLS existants restent applicables.
-- L’édition administrative existante ne modifie pas cette origine.
commit;
