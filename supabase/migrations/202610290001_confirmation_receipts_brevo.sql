-- Additive switch to Brevo. Apply AFTER 202610260002, with sending disabled.
begin;
-- Never replay a payload already prepared for a different provider.
update public.confirmation_receipts
set state='manual_review', error_code='provider_changed'
where state in ('queued','failed','sending') and delivery_payload is not null
and not (delivery_payload ? 'sender' and coalesce(delivery_payload->'headers','{}'::jsonb) ? 'IdempotencyKey');
create or replace function public.claim_confirmation_receipt() returns setof public.confirmation_receipts
language plpgsql security definer set search_path='' as $$
declare job public.confirmation_receipts;
begin
 -- Brevo idempotency lasts 15 minutes. Stop automatic retries after 14 minutes.
 update public.confirmation_receipts set state='manual_review',error_code='idempotency_window_expired'
 where state in ('queued','failed','sending') and first_attempt_at < now()-interval '14 minutes';
 select * into job from public.confirmation_receipts
 where (state in ('queued','failed') or (state='sending' and lease_until<now())) and next_attempt_at<=now()
 order by created_at for update skip locked limit 1;
 if not found then return; end if;
 return query update public.confirmation_receipts set state='sending',attempts=attempts+1,
 first_attempt_at=coalesce(first_attempt_at,now()),lease_until=now()+interval '5 minutes',lease_token=gen_random_uuid(),error_code=null
 where response_id=job.response_id returning *;
end; $$;
create or replace function public.retry_confirmation_receipt(p_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' then raise exception using errcode='42501',message='Admin required'; end if;
 update public.confirmation_receipts set next_attempt_at=now()
 where response_id=p_id and state='failed' and first_attempt_at>now()-interval '14 minutes';
 return found;
end; $$;
commit;
