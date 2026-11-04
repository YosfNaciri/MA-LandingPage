# GS Strategies dans le dashboard Martine Adam

La page `/admin/gs-strategies` utilise le client Supabase existant de l’application et la table `public.form_submissions`, selon la définition fournie : `id`, `created_at`, `form_key`, `form_name`, `answers`.

## Activation

1. Vérifier que `form_submissions` est dans le projet désigné par `VITE_SUPABASE_URL`. Si elle est dans un autre projet, une connexion serveur distincte sera nécessaire ; ne pas remplacer les paramètres du projet Martine Adam.
2. Exécuter `supabase/migrations/202611040001_gs_strategies_admin.sql` dans le SQL Editor de ce projet. Le script ajoute `status` avec la valeur initiale `new`, conserve les réponses et les droits INSERT de `service_role`, et autorise les administrateurs à lire, modifier uniquement le statut et supprimer.
3. Les comptes administrateurs doivent avoir `app_metadata.role = "admin"`, comme les autres pages du dashboard. Reconnexion nécessaire après un changement de rôle.

Aucune clé supplémentaire à mettre dans `.env.local`. Aucune clé service_role dans le navigateur. Aucun changement de WordPress ou déploiement effectué pour cette intégration.

## Fonctions

Vue d’ensemble (total, nouveaux, FR/EN, cinq dernières demandes), recherche sur les coordonnées et toutes les réponses, filtres de langue, province du cabinet, ville, délai et intervalle de prix, liste complète défilante accessible via « Tout voir », fiche avec sections, statut Nouveau / En cours / Clôturé, suppression après confirmation et retour effectif de l’ID supprimé, export CSV de tous les résultats filtrés.

Les réponses sont compatibles avec les valeurs simples, listes et objets `{label, value, section, type}`. Les ID `prenom`/`first_name`/`firstname`, `nom`/`last_name`/`lastname`, `name`/`full_name`, `courriel`/`email` et `nom_cabinet`/`company_name`/`firm_name` alimentent les résumés. Les autres réponses restent dans les fiches et le CSV. Les champs HTML, étapes, mots de passe et antispam typés sont exclus.

Les sections d’origine sont conservées lorsqu’elles existent. Sinon, les réponses sont regroupées selon les règles du projet GS Form Manager. La langue est déduite des identifiants `sellerFormFR` / `sellerForm` ou des mentions FR/EN dans le nom/la clé ; les autres formulaires restent visibles avec « Non précisée ». La table entière est traitée comme la source GS Strategies, conformément à la demande.

Les lectures utilisent une pagination par UUID, puis la recherche et le tri sont effectués en mémoire. Cela assure un export complet malgré le plafond Supabase, mais il faudra une recherche SQL paginée pour un volume très important. L’export et la liste ne constituent pas un instantané transactionnel si d’autres administrateurs modifient des réponses simultanément.

## Vérification locale

`npm run lint`, `npm run build`, `node --test tests/unit/gs-strategies.mjs tests/sql/gs-strategies.mjs`.
Le test SQL utilise PostgreSQL local jetable (PGlite) : reprise, réexécution de la migration, accès administrateur, refus des autres rôles, statut limité, suppression et conservation de l’ingestion service_role. Aucune donnée distante modifiée.
Test navigateur prévu : `npm run test:e2e -- tests/admin.spec.js -g 'GS Strategies'`.

La fiche présente le rôle sous le nom, sans répéter les champs nom/prénom dans les réponses. Ces champs restent conservés dans les données et le CSV. Les dates affichées ne contiennent pas d’heure (jour civil du cabinet, America/Toronto). Les options province/ville/délai sont tirées des réponses, avec reconnaissance des ID usuels FR/EN et des libellés. Les prix numériques et fourchettes en dollars, milliers et millions sont pris en charge ; une fourchette apparaît dans chaque intervalle qu’elle recoupe. Les valeurs indéterminées peuvent être filtrées séparément.
