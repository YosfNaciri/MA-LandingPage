-- Nouveau projet : édition réservée aux administrateurs. Exécuter après les droits de lecture.
begin;
alter table public.client_tax_season_confirmations enable row level security;
revoke update on public.client_tax_season_confirmations from public, anon, authenticated;
grant update (first_name, last_name, phone, email, people, people_count, yes_data, no_data)
 on public.client_tax_season_confirmations to authenticated;
drop policy if exists "Confirmation admin update boundary" on public.client_tax_season_confirmations;
create policy "Confirmation admin update boundary" on public.client_tax_season_confirmations as restrictive
 for update to anon, authenticated
 using (coalesce((select auth.jwt())->'app_metadata'->>'role','') = 'admin')
 with check (coalesce((select auth.jwt())->'app_metadata'->>'role','') = 'admin');
drop policy if exists "Confirmation admins can update" on public.client_tax_season_confirmations;
create policy "Confirmation admins can update" on public.client_tax_season_confirmations
 for update to authenticated
 using (coalesce((select auth.jwt())->'app_metadata'->>'role','') = 'admin')
 with check (coalesce((select auth.jwt())->'app_metadata'->>'role','') = 'admin');

-- Horodatage côté serveur : le navigateur vérifie cette version à chaque sauvegarde.
create or replace function public.stamp_confirmation_update()
returns trigger language plpgsql set search_path = '' as $$
begin
 new.updated_at := clock_timestamp();
 return new;
end;
$$;
revoke all on function public.stamp_confirmation_update() from public, anon, authenticated;
drop trigger if exists stamp_confirmation_update on public.client_tax_season_confirmations;
create trigger stamp_confirmation_update before update on public.client_tax_season_confirmations
 for each row execute function public.stamp_confirmation_update();
commit;
