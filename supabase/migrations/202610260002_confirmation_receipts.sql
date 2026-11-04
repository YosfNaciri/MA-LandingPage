begin;
create function public.confirmation_receipt_snapshot(p_wants boolean,p_people jsonb) returns jsonb
language sql immutable set search_path='' as $$
 select jsonb_build_object('wants_tax_service',p_wants,'people',coalesce((select jsonb_agg(jsonb_build_object(
 'id',p->>'id','first_name',p->>'first_name','last_name',p->>'last_name','relation',p->>'relation',
 'prepared_2025',p->>'prepared_2025','calculated_status',p->>'calculated_status'))
 from jsonb_array_elements(public.normalized_confirmation_people(p_people,p_wants)) p),'[]'::jsonb));
$$;
create table public.confirmation_receipts (
 response_id uuid primary key references public.client_tax_season_confirmations(id) on delete cascade,
 variant text not null check(variant in ('A','B','Non')),
 state text not null check(state in ('queued','sending','sent','failed','manual_review','skipped_no_email','skipped_legacy')),
 recipient text,
 snapshot jsonb not null,
 delivery_payload jsonb,
 created_at timestamptz not null default now(),
 sent_at timestamptz,
 attempts integer not null default 0,
 first_attempt_at timestamptz,
 next_attempt_at timestamptz not null default now(),
 lease_until timestamptz,
 lease_token uuid,
 provider_id text,
 error_code text
);
alter table public.confirmation_receipts enable row level security;
revoke all on public.confirmation_receipts from public,anon,authenticated;
grant select(response_id,variant,state,created_at,sent_at,attempts,first_attempt_at,next_attempt_at,error_code) on public.confirmation_receipts to authenticated;
grant all on public.confirmation_receipts to service_role;
create policy receipt_admin_read on public.confirmation_receipts for select to authenticated
using(coalesce((select auth.jwt())->'app_metadata'->>'role','')='admin');

create function public.enqueue_confirmation_receipt() returns trigger
language plpgsql security definer set search_path='' as $$
declare snap jsonb; variant text;
begin
 snap:=public.confirmation_receipt_snapshot(new.wants_tax_service,new.people);
 variant:=case when new.wants_tax_service is not true then 'Non'
 when exists(select 1 from jsonb_array_elements(snap->'people') p where p->>'calculated_status'<>'confirmed') or jsonb_array_length(snap->'people')=0 then 'B' else 'A' end;
 insert into public.confirmation_receipts(response_id,variant,state,recipient,snapshot)
 values(new.id,variant,case when nullif(new.email,'') is null then 'skipped_no_email' else 'queued' end,new.email,snap)
 on conflict(response_id) do nothing;
 return new;
end; $$;
-- Pas d’envoi rétroactif des réponses présentes avant cette migration.
insert into public.confirmation_receipts(response_id,variant,state,snapshot)
select r.id,case when r.wants_tax_service is not true then 'Non'
 when exists(select 1 from jsonb_array_elements(public.normalized_confirmation_people(r.people,true)) p where p->>'calculated_status'<>'confirmed') or jsonb_array_length(public.normalized_confirmation_people(r.people,true))=0 then 'B' else 'A' end,
 'skipped_legacy',public.confirmation_receipt_snapshot(r.wants_tax_service,r.people)
from public.client_tax_season_confirmations r on conflict(response_id) do nothing;
create trigger confirmation_enqueue after insert on public.client_tax_season_confirmations
 for each row execute function public.enqueue_confirmation_receipt();

create function public.submit_tax_confirmation(p_record jsonb,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare saved public.client_tax_season_confirmations; snap jsonb; fingerprint text;
begin
 if p_request_id is null or jsonb_typeof(p_record)<>'object' or octet_length(p_record::text)>250000 then raise exception 'Invalid submission'; end if;
 fingerprint:=md5(p_record::text);
 -- Serializes identical request tokens, including two simultaneous HTTP requests.
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 select * into saved from public.client_tax_season_confirmations where request_id=p_request_id;
 if found then
  if saved.request_fingerprint<>fingerprint then raise exception 'Request token already used'; end if;
 else
  insert into public.client_tax_season_confirmations(tax_year,first_name,last_name,email,phone,wants_tax_service,people,people_count,yes_data,no_data,initial_response_at,status,client_type,request_id,request_fingerprint)
  values((p_record->>'tax_year')::integer,p_record->>'first_name',p_record->>'last_name',p_record->>'email',p_record->>'phone',
   (p_record->>'wants_tax_service')::boolean,p_record->'people',jsonb_array_length(p_record->'people'),
   coalesce(p_record->'yes_data','{}'),coalesce(p_record->'no_data','{}'),now(),'completed',
   coalesce(p_record->>'client_type','returning_client'),p_request_id,fingerprint)
  returning * into saved;
 end if;
 select snapshot into snap from public.confirmation_receipts where response_id=saved.id;
 return jsonb_build_object('id',saved.id,'receipt_snapshot',snap);
end; $$;
revoke all on function public.submit_tax_confirmation(jsonb,uuid) from public;
grant execute on function public.submit_tax_confirmation(jsonb,uuid) to anon,authenticated;

create function public.claim_confirmation_receipt() returns setof public.confirmation_receipts
language plpgsql security definer set search_path='' as $$
declare job public.confirmation_receipts;
begin
 -- Resend idempotency lasts 24h. Never automatically retry an uncertain send beyond 23h.
 update public.confirmation_receipts set state='manual_review',error_code='idempotency_window_expired'
 where state in ('queued','failed','sending') and first_attempt_at < now()-interval '23 hours';
 select * into job from public.confirmation_receipts
 where (state in ('queued','failed') or (state='sending' and lease_until<now())) and next_attempt_at<=now()
 order by created_at for update skip locked limit 1;
 if not found then return; end if;
 return query update public.confirmation_receipts set state='sending',attempts=attempts+1,
 first_attempt_at=coalesce(first_attempt_at,now()),lease_until=now()+interval '5 minutes',lease_token=gen_random_uuid(),error_code=null
 where response_id=job.response_id returning *;
end; $$;
create function public.finish_confirmation_receipt(p_id uuid,p_lease uuid,p_provider_id text,p_error text default null) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 update public.confirmation_receipts set state=case when p_error is null then 'sent' else 'failed' end,
 sent_at=case when p_error is null then now() else null end,provider_id=p_provider_id,
 error_code=case when p_error is null then null else left(p_error,64) end,
 next_attempt_at=now()+interval '5 minutes',lease_until=null
 where response_id=p_id and lease_token=p_lease and state='sending';
 return found;
end; $$;
create function public.retry_confirmation_receipt(p_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' then raise exception using errcode='42501',message='Admin required'; end if;
 update public.confirmation_receipts set next_attempt_at=now()
 where response_id=p_id and state='failed' and first_attempt_at>now()-interval '23 hours';
 return found;
end; $$;
revoke all on function public.confirmation_receipt_snapshot(boolean,jsonb),public.enqueue_confirmation_receipt(),public.claim_confirmation_receipt(),public.finish_confirmation_receipt(uuid,uuid,text,text),public.retry_confirmation_receipt(uuid) from public,anon,authenticated;
grant execute on function public.claim_confirmation_receipt(),public.finish_confirmation_receipt(uuid,uuid,text,text) to service_role;
grant execute on function public.retry_confirmation_receipt(uuid) to authenticated;
commit;
