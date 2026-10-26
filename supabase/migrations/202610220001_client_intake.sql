-- Ouverture de dossier : tables indépendantes des confirmations fiscales.
begin;
create table public.client_intake_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  status text not null default 'Nouveau',
  type_client text not null,
  nom_legal text not null,
  nom_commercial text,
  courriel text not null,
  telephone text not null,
  langue text,
  contact_principal text,
  date_ouverture date,
  payload jsonb not null default '{}'::jsonb,
  user_agent text,
  unique (id, user_id)
);
create index client_intake_owner_created on public.client_intake_submissions (user_id, created_at desc);
create table public.client_intake_documents (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null,
  user_id uuid not null,
  document_type text not null,
  original_filename text not null,
  storage_path text not null unique,
  mime_type text,
  file_size bigint check (file_size >= 0),
  status text not null default 'Reçu',
  uploaded_at timestamptz not null default now(),
  foreign key (submission_id, user_id)
    references public.client_intake_submissions (id, user_id) on delete cascade,
  check (split_part(storage_path, '/', 1) = user_id::text
    and split_part(storage_path, '/', 2) = submission_id::text)
);
create index client_intake_documents_owner on public.client_intake_documents (user_id, submission_id);
alter table public.client_intake_submissions enable row level security;
alter table public.client_intake_documents enable row level security;
revoke all on public.client_intake_submissions, public.client_intake_documents from anon, authenticated;
grant select, insert on public.client_intake_submissions, public.client_intake_documents to authenticated;
create policy intake_owner_read on public.client_intake_submissions for select to authenticated
  using (user_id = (select auth.uid()));
create policy intake_owner_insert on public.client_intake_submissions for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'Nouveau');
create policy intake_document_owner_read on public.client_intake_documents for select to authenticated
  using (user_id = (select auth.uid()));
create policy intake_document_owner_insert on public.client_intake_documents for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'Reçu');

insert into storage.buckets (id, name, public)
  values ('intake-documents', 'intake-documents', false)
  on conflict (id) do update set public = false;
create policy intake_file_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'intake-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy intake_file_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'intake-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.client_intake_submissions s
      where s.id::text = (storage.foldername(name))[2]
        and s.user_id = (select auth.uid())));
commit;
