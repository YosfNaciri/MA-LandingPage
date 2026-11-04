-- Additif, base actuelle uniquement. Ne rejoue aucune migration historique.
begin;
-- Précondition : la table du schéma actuellement utilisé par le frontend existe.
do $$ begin
 if not exists(select 1 from information_schema.columns where table_schema='public'
   and table_name='client_tax_season_confirmations' and column_name='yes_data') then
   raise exception 'Schema incompatible: audit required';
 end if;
end $$;
alter table public.client_tax_season_confirmations
 add column request_id uuid,
 add column request_fingerprint text;
create unique index confirmation_request_unique on public.client_tax_season_confirmations(request_id) where request_id is not null;

create function public.confirmation_person_status(p_relation text, p_answer text, p_self text default 'verify')
returns text language sql immutable set search_path = '' as $$
 select case when p_relation='spouse' then coalesce(p_self,'verify')
 when p_answer='yes' then 'confirmed'
 when p_answer='no' and p_relation in ('self','child','parent') then 'review'
 else 'verify' end;
$$;
create function public.normalized_confirmation_people(p_people jsonb, p_wants boolean)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare result jsonb := '[]'; item jsonb; self_status text; key text; used text[] := '{}'; n integer := 0;
begin
 if jsonb_typeof(p_people) is distinct from 'array' then return result; end if;
 select public.confirmation_person_status('self',value->>'prepared_2025') into self_status
 from jsonb_array_elements(p_people) where value->>'relation'='self' limit 1;
 for item in select value from jsonb_array_elements(p_people) loop
   n:=n+1;
   if jsonb_typeof(item) <> 'object' then continue; end if;
   key:=coalesce(nullif(item->>'id',''),'legacy-'||n);
   while key=any(used) loop key:='legacy-'||n||'-'||key; end loop;
   used:=array_append(used,key);
   result:=result||jsonb_build_array(item||jsonb_build_object('id',key,'calculated_status',
     case when p_wants is true then public.confirmation_person_status(item->>'relation',item->>'prepared_2025',self_status) else null end));
 end loop;
 return result;
end;
$$;

create table public.client_confirmation_people (
 id uuid primary key default gen_random_uuid(),
 response_id uuid not null references public.client_tax_season_confirmations(id) on delete cascade,
 person_key text not null,
 position integer not null,
 first_name text, last_name text, relation text, prepared_2025 text,
 sin_last_three text, contact text,
 calculated_status text not null check(calculated_status in ('confirmed','review','verify')),
 source_data jsonb not null,
 cabinet_decision text check(cabinet_decision in ('Accepté','Refusé','Client 2025 confirmé après vérification')),
 decision_at timestamptz,
 cabinet_response_sent boolean not null default false,
 cabinet_response_sent_at timestamptz,
 version bigint not null default 1,
 unique(response_id,person_key)
);
create index confirmation_people_status on public.client_confirmation_people(calculated_status,response_id);
alter table public.client_confirmation_people enable row level security;
revoke all on public.client_confirmation_people from public, anon, authenticated;
grant select on public.client_confirmation_people to authenticated;
grant update(cabinet_decision,cabinet_response_sent) on public.client_confirmation_people to authenticated;
grant all on public.client_confirmation_people to service_role;
create policy confirmation_people_admin_read on public.client_confirmation_people for select to authenticated
 using(coalesce((select auth.jwt())->'app_metadata'->>'role','')='admin');
create policy confirmation_people_admin_decide on public.client_confirmation_people for update to authenticated
 using(coalesce((select auth.jwt())->'app_metadata'->>'role','')='admin')
 with check(coalesce((select auth.jwt())->'app_metadata'->>'role','')='admin');

create function public.stamp_confirmation_person() returns trigger language plpgsql set search_path='' as $$
begin
 new.version:=old.version+1;
 if new.cabinet_decision is distinct from old.cabinet_decision then
   new.decision_at:=case when new.cabinet_decision is null then null else clock_timestamp() end;
 end if;
 if new.cabinet_response_sent is distinct from old.cabinet_response_sent then
   new.cabinet_response_sent_at:=case when new.cabinet_response_sent then clock_timestamp() else null end;
 end if;
 return new;
end; $$;
create trigger confirmation_person_stamp before update on public.client_confirmation_people
 for each row execute function public.stamp_confirmation_person();

-- JSON people est la source des réponses; la table est sa projection serveur.
-- Décisions/suivi sont exclusivement dans la table liée, jamais écrasés par le JSON.
create function public.sync_confirmation_people() returns trigger language plpgsql security definer set search_path='' as $$
declare item jsonb; n integer:=0; normalized jsonb;
begin
 normalized:=public.normalized_confirmation_people(new.people,new.wants_tax_service);
 if new.wants_tax_service is true then
  for item in select value from jsonb_array_elements(normalized) loop
   n:=n+1;
   insert into public.client_confirmation_people(response_id,person_key,position,first_name,last_name,relation,prepared_2025,sin_last_three,contact,calculated_status,source_data)
   values(new.id,item->>'id',n,item->>'first_name',item->>'last_name',item->>'relation',item->>'prepared_2025',
     item->>'sin_last_three',item->>'contact',item->>'calculated_status',item)
   on conflict(response_id,person_key) do update set position=excluded.position,first_name=excluded.first_name,
    last_name=excluded.last_name,relation=excluded.relation,prepared_2025=excluded.prepared_2025,
    sin_last_three=excluded.sin_last_three,contact=excluded.contact,calculated_status=excluded.calculated_status,source_data=excluded.source_data
   where client_confirmation_people.source_data is distinct from excluded.source_data or client_confirmation_people.position<>excluded.position;
  end loop;
 end if;
 delete from public.client_confirmation_people where response_id=new.id and
 (new.wants_tax_service is not true or not exists(select 1 from jsonb_array_elements(normalized) p where p->>'id'=person_key));
 return new;
end; $$;

-- Backfill : préserver le JSON historique byte pour byte et toutes les données.
-- Les clés manquantes ou dupliquées reçoivent une clé déterministe dans la projection.
insert into public.client_confirmation_people(response_id,person_key,position,first_name,last_name,relation,prepared_2025,sin_last_three,contact,calculated_status,source_data)
select r.id,p.item->>'id',p.ord::integer,p.item->>'first_name',p.item->>'last_name',p.item->>'relation',p.item->>'prepared_2025',
 p.item->>'sin_last_three',p.item->>'contact',p.item->>'calculated_status',p.item
from public.client_tax_season_confirmations r
cross join lateral jsonb_array_elements(public.normalized_confirmation_people(r.people,r.wants_tax_service)) with ordinality p(item,ord)
where r.wants_tax_service is true
on conflict(response_id,person_key) do nothing;

create function public.validate_confirmation_response() returns trigger language plpgsql set search_path='' as $$
declare p jsonb; part jsonb; details jsonb; normalized jsonb; c integer; r integer; v integer;
begin
 if new.wants_tax_service is null or new.client_type not in ('new_client','returning_client')
 or length(trim(coalesce(new.first_name,''))) not between 1 and 100
 or length(trim(coalesce(new.last_name,''))) not between 1 and 100
 or length(regexp_replace(coalesce(new.phone,''),'[^0-9]','','g')) not between 10 and 15
 or jsonb_typeof(new.people) is distinct from 'array' or jsonb_array_length(new.people) not between 1 and 100 then
   raise exception using errcode='22023',message='Invalid confirmation';
 end if;
 details:=case when new.wants_tax_service then new.yes_data else new.no_data end;
 if jsonb_typeof(details) is distinct from 'object' then raise exception 'Invalid details'; end if;
 if coalesce(details->>'no_email','false')='true' then new.email:=null;
 elsif coalesce(new.email,'') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(new.email)>254 then
   raise exception using errcode='22023',message='Invalid email';
 end if;
 if coalesce(details->>'sin_last_three','')<>'' and details->>'sin_last_three' !~ '^[0-9]{3}$' then raise exception 'Invalid partial identifier'; end if;
 if (tg_op='INSERT' and (select count(*) from jsonb_array_elements(new.people) x where x->>'relation'='self')<>1)
 or (select count(*) from jsonb_array_elements(new.people) x where x->>'relation'='self')>1
 or (select count(*) from jsonb_array_elements(new.people) x where x->>'relation'='spouse')>1 then raise exception 'Invalid relations'; end if;
 for p in select value from jsonb_array_elements(new.people) loop
  if jsonb_typeof(p)<>'object' or coalesce(p->>'relation','') not in ('self','spouse','child','parent','other')
  or length(trim(coalesce(p->>'first_name',''))) not between 1 and 100
  or length(trim(coalesce(p->>'last_name',''))) not between 1 and 100
  or coalesce(p->>'prepared_2025','') not in ('','yes','no','unknown') then raise exception 'Invalid person'; end if;
  if coalesce(p->>'sin_last_three','')<>'' and p->>'sin_last_three' !~ '^[0-9]{3}$' then raise exception 'Invalid partial identifier'; end if;
 end loop;
 -- Missing historical ids are repaired deterministically. Nonempty duplicate ids are rejected.
 if exists(select elem->>'id' from jsonb_array_elements(new.people) elem where nullif(elem->>'id','') is not null group by elem->>'id' having count(*)>1) then raise exception 'Duplicate person key'; end if;
 normalized:=public.normalized_confirmation_people(new.people,new.wants_tax_service);
 if jsonb_typeof(details->'particularities')='array' then
  for part in select value from jsonb_array_elements(details->'particularities') loop
   if coalesce(part->>'type','') not in ('none','unknown') and nullif(part->>'person_id','') is not null
     and not exists(select 1 from jsonb_array_elements(normalized) x where x->>'id'=part->>'person_id') then raise exception 'Unknown person reference'; end if;
  end loop;
 end if;
 new.people:=normalized;
 new.people_count:=jsonb_array_length(normalized);
 select count(*) filter(where x->>'calculated_status'='confirmed'),count(*) filter(where x->>'calculated_status'='review'),count(*) filter(where x->>'calculated_status'='verify')
 into c,r,v from jsonb_array_elements(normalized) x;
 details:=details||jsonb_build_object('confirmed_count',c,'review_count',r,'verify_count',v,'old_clients_count',c,'to_validate_count',r+v);
 if new.wants_tax_service then new.yes_data:=details; else new.no_data:=details; end if;
 return new;
end; $$;
create trigger confirmation_validate before insert or update of people,yes_data,no_data,first_name,last_name,email,phone,wants_tax_service
 on public.client_tax_season_confirmations for each row execute function public.validate_confirmation_response();
create trigger confirmation_sync after insert or update of people,wants_tax_service
 on public.client_tax_season_confirmations for each row execute function public.sync_confirmation_people();

revoke all on function public.sync_confirmation_people(),public.validate_confirmation_response(),public.stamp_confirmation_person() from public,anon,authenticated;
revoke all on function public.normalized_confirmation_people(jsonb,boolean),public.confirmation_person_status(text,text,text) from public;
grant execute on function public.normalized_confirmation_people(jsonb,boolean),public.confirmation_person_status(text,text,text) to anon,authenticated,service_role;
commit;
