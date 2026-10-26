-- Après 202610220001_client_intake.sql et 202610230001_admin_intake_read.sql.
begin;
alter table public.client_intake_submissions add column if not exists updated_at timestamptz not null default now();
create table public.client_intake_status_history (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.client_intake_submissions(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users(id) on delete set null,
  note text
);
create index intake_history_changed on public.client_intake_status_history(changed_at desc);
alter table public.client_intake_status_history enable row level security;
revoke all on public.client_intake_status_history from anon, authenticated;
grant select on public.client_intake_status_history to authenticated;
create policy intake_history_admin_read on public.client_intake_status_history for select to authenticated
using (coalesce((select auth.jwt())->'app_metadata'->>'role', '') = 'admin');
grant update(status) on public.client_intake_submissions to authenticated;
create policy intake_admin_update_status on public.client_intake_submissions for update to authenticated
using (coalesce((select auth.jwt())->'app_metadata'->>'role', '') = 'admin')
with check (coalesce((select auth.jwt())->'app_metadata'->>'role', '') = 'admin');
create function public.record_intake_status_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    if new.status not in ('Nouveau','En révision','Documents manquants','En traitement','Complété','Archivé') then
      raise exception 'Statut de dossier invalide';
    end if;
    new.updated_at := now();
    insert into public.client_intake_status_history(submission_id,old_status,new_status,changed_by,note)
    values(new.id,old.status,new.status,auth.uid(),'Statut modifié depuis l’espace admin');
  end if;
  return new;
end;
$$;
revoke all on function public.record_intake_status_change() from public, anon, authenticated;
create trigger intake_status_changed before update of status on public.client_intake_submissions
for each row execute function public.record_intake_status_change();
commit;
