-- Nouveau projet uniquement. Rend le formulaire public sans ouvrir la lecture des réponses.
begin;
drop function if exists public.submit_client_confirmation(text,jsonb);
drop function if exists public.create_confirmation_invitation(text,integer);
-- Les anciennes invitations sont conservées, sans accès navigateur, si elles existent.
create or replace function public.submit_client_confirmation(p_payload jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_row public.client_tax_season_confirmations;
begin
 if p_payload is null or jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text)>100000 then raise exception 'Réponse invalide'; end if;
 v_row := jsonb_populate_record(null::public.client_tax_season_confirmations,p_payload);
 insert into public.client_tax_season_confirmations(tax_season,wants_tax_service,decline_scope,respondent_first_name,respondent_last_name,people,total_people,old_clients_count,to_validate_count,is_couple,has_children,children_count,identification_person_name,sin_last_three,particularities,document_method,document_method_note,phone,email,no_email,user_agent)
 values (v_row.tax_season,v_row.wants_tax_service,v_row.decline_scope,v_row.respondent_first_name,v_row.respondent_last_name,v_row.people,v_row.total_people,v_row.old_clients_count,v_row.to_validate_count,v_row.is_couple,v_row.has_children,v_row.children_count,v_row.identification_person_name,v_row.sin_last_three,v_row.particularities,v_row.document_method,v_row.document_method_note,v_row.phone,v_row.email,v_row.no_email,v_row.user_agent);
end $$;
revoke all on function public.submit_client_confirmation(jsonb) from public, anon, authenticated;
grant execute on function public.submit_client_confirmation(jsonb) to anon, authenticated;
commit;
