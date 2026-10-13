-- Nouvelle base uniquement. Aucun transfert de données.
begin;
create table public.client_tax_season_confirmations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tax_season text not null check (tax_season ~ '^[0-9]{4}$'),
  wants_tax_service boolean not null,
  decline_scope text check (decline_scope in ('self', 'couple', 'all')),
  respondent_first_name text not null check (length(trim(respondent_first_name)) between 1 and 100),
  respondent_last_name text not null check (length(trim(respondent_last_name)) between 1 and 100),
  people jsonb not null check (jsonb_typeof(people) = 'array' and jsonb_array_length(people) > 0),
  total_people integer not null check (total_people > 0 and total_people = jsonb_array_length(people)),
  old_clients_count integer not null check (old_clients_count >= 0),
  to_validate_count integer not null check (to_validate_count >= 0),
  is_couple boolean not null,
  has_children boolean not null,
  children_count integer not null check (children_count >= 0 and children_count <= total_people),
  identification_person_name text not null check (length(trim(identification_person_name)) between 1 and 201),
  sin_last_three text not null check (sin_last_three ~ '^[0-9]{3}$'),
  particularities jsonb not null default '[]'::jsonb check (jsonb_typeof(particularities) = 'array'),
  document_method text not null check (document_method in ('paper', 'electronic', 'unknown', 'not_applicable')),
  document_method_note text check (length(document_method_note) <= 500),
  phone text not null check (length(regexp_replace(phone, '[^0-9]', '', 'g')) between 10 and 15),
  email text check (length(email) <= 254),
  no_email boolean not null,
  user_agent text,
  check (old_clients_count + to_validate_count = total_people),
  check (has_children = (children_count > 0)),
  check ((no_email and email is null) or (not no_email and email is not null and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
  check ((wants_tax_service and decline_scope is null and document_method <> 'not_applicable') or (not wants_tax_service and decline_scope is not null and document_method = 'not_applicable'))
);

alter table public.client_tax_season_confirmations enable row level security;
revoke all on public.client_tax_season_confirmations from anon, authenticated;

grant all on public.client_tax_season_confirmations to service_role;

-- Aucune lecture, modification ou suppression de dossiers via le navigateur.
commit;
