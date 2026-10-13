-- Nouvelle base uniquement, après 001 et 002.
begin;
create table public.client_confirmation_invitations (
 id uuid primary key default gen_random_uuid(),
 token_hash text not null unique,
 tax_season text not null check (tax_season ~ '^[0-9]{4}$'),
 expires_at timestamptz not null,
 used_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.client_confirmation_invitations enable row level security;
revoke all on public.client_confirmation_invitations from anon, authenticated;
alter table public.client_tax_season_confirmations add column invitation_id uuid unique references public.client_confirmation_invitations(id);

create function public.create_confirmation_invitation(p_tax_season text default '2026', p_days integer default 30)
returns text language plpgsql security definer set search_path = '' as $$
declare v_token text;
begin
 if coalesce(auth.jwt()->'app_metadata'->>'role','') <> 'admin' then
  raise exception 'Administrator required' using errcode = '42501';
 end if;
 if p_days is null or p_days < 1 or p_days > 90 then raise exception 'Invalid expiry'; end if;
 v_token := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
 insert into public.client_confirmation_invitations(token_hash,tax_season,expires_at)
 values (encode(sha256(convert_to(v_token,'UTF8')),'hex'),p_tax_season,now()+make_interval(days=>p_days));
 return v_token;
end $$;
revoke all on function public.create_confirmation_invitation(text,integer) from public, anon, authenticated;
grant execute on function public.create_confirmation_invitation(text,integer) to authenticated;

create function public.submit_client_confirmation(p_token text,p_payload jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_inv public.client_confirmation_invitations; v_row public.client_tax_season_confirmations;
begin
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'Invitation invalide'; end if;
 select * into v_inv from public.client_confirmation_invitations
 where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
 if not found or v_inv.used_at is not null or v_inv.expires_at <= now() then
  raise exception 'Invitation invalide, expirée ou déjà utilisée';
 end if;
 if p_payload is null or jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text)>100000 then raise exception 'Réponse invalide'; end if;
 v_row := jsonb_populate_record(null::public.client_tax_season_confirmations,p_payload);
 if v_row.tax_season is distinct from v_inv.tax_season then raise exception 'Saison invalide'; end if;
 insert into public.client_tax_season_confirmations(invitation_id,tax_season,wants_tax_service,decline_scope,respondent_first_name,respondent_last_name,people,total_people,old_clients_count,to_validate_count,is_couple,has_children,children_count,identification_person_name,sin_last_three,particularities,document_method,document_method_note,phone,email,no_email,user_agent)
 values (v_inv.id,v_row.tax_season,v_row.wants_tax_service,v_row.decline_scope,v_row.respondent_first_name,v_row.respondent_last_name,v_row.people,v_row.total_people,v_row.old_clients_count,v_row.to_validate_count,v_row.is_couple,v_row.has_children,v_row.children_count,v_row.identification_person_name,v_row.sin_last_three,v_row.particularities,v_row.document_method,v_row.document_method_note,v_row.phone,v_row.email,v_row.no_email,v_row.user_agent);
 update public.client_confirmation_invitations set used_at=now() where id=v_inv.id;
end $$;
revoke all on function public.submit_client_confirmation(text,jsonb) from public, anon, authenticated;
grant execute on function public.submit_client_confirmation(text,jsonb) to anon, authenticated;
commit;
