-- Remplacer le courriel par celui d'un compte existant dans Authentication > Users.
-- Exécuter dans le SQL Editor Supabase avec les droits d'administration.
-- Aucun mot de passe ni clé secrète ne doit être ajouté au code du site.
do $$
declare
  admin_email text := 'REMPLACER_PAR_LE_COURRIEL_ADMIN';
  affected integer;
begin
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
  where lower(email) = lower(admin_email);
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'Un compte Supabase existant doit correspondre exactement au courriel choisi.';
  end if;
end $$;
-- Se déconnecter puis se reconnecter pour renouveler les droits de la session.
