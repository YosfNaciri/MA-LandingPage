begin;
-- Existing submissions remain in place; WordPress service_role INSERT is preserved.
alter table public.form_submissions
  add column if not exists status text not null default 'new';
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.form_submissions'::regclass and conname = 'form_submissions_status_allowed') then
    alter table public.form_submissions add constraint form_submissions_status_allowed
      check (status in ('new', 'in_progress', 'closed'));
  end if;
end $$;
alter table public.form_submissions enable row level security;
grant usage on schema public to authenticated;
grant select, delete on public.form_submissions to authenticated;
grant update (status) on public.form_submissions to authenticated;

-- Restrictive boundaries prevent another permissive policy opening access to non-admins.
drop policy if exists gs_admin_read_boundary on public.form_submissions;
create policy gs_admin_read_boundary on public.form_submissions as restrictive for select to authenticated
  using ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
drop policy if exists gs_admin_read on public.form_submissions;
create policy gs_admin_read on public.form_submissions for select to authenticated
  using ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
drop policy if exists gs_admin_update_boundary on public.form_submissions;
create policy gs_admin_update_boundary on public.form_submissions as restrictive for update to authenticated
  using ((select auth.jwt()->'app_metadata'->>'role') = 'admin')
  with check ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
drop policy if exists gs_admin_update on public.form_submissions;
create policy gs_admin_update on public.form_submissions for update to authenticated
  using ((select auth.jwt()->'app_metadata'->>'role') = 'admin')
  with check ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
drop policy if exists gs_admin_delete_boundary on public.form_submissions;
create policy gs_admin_delete_boundary on public.form_submissions as restrictive for delete to authenticated
  using ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
drop policy if exists gs_admin_delete on public.form_submissions;
create policy gs_admin_delete on public.form_submissions for delete to authenticated
  using ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
commit;
