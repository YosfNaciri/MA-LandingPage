-- À exécuter après 202610220001_client_intake.sql sur la base actuelle.
-- Lecture uniquement : n'ajoute aucun droit de modification/suppression.
begin;
drop policy if exists intake_admin_read on public.client_intake_submissions;
create policy intake_admin_read on public.client_intake_submissions for select to authenticated
  using (coalesce((select auth.jwt())->'app_metadata'->>'role', '') = 'admin');
drop policy if exists intake_document_admin_read on public.client_intake_documents;
create policy intake_document_admin_read on public.client_intake_documents for select to authenticated
  using (coalesce((select auth.jwt())->'app_metadata'->>'role', '') = 'admin');
drop policy if exists intake_file_admin_read on storage.objects;
create policy intake_file_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'intake-documents'
    and coalesce((select auth.jwt())->'app_metadata'->>'role', '') = 'admin');
commit;
