# Validation du schéma réel — 13 octobre 2026

Le code utilise tax_year, first_name, last_name, people_count, yes_data et no_data.
Le contrôle distant confirme que toutes les colonnes existent, sans lire ni créer de dossier.
Compilation et ESLint réussis. Test PostgreSQL local réussi : insertions Oui/Non et restitution intégrale de tous les champs pour l’administration.
Les tests navigateur actualisés n’ont pas pu démarrer : Chrome est bloqué par les permissions de cette session (SIGABRT/EPERM). Aucun résultat navigateur récent n’est revendiqué.
Les autorisations INSERT de la base distante et un envoi réel restent à vérifier. Le script supabase/enable-existing-form.sql permet d’autoriser les envois publics tout en limitant la lecture aux administrateurs. Aucun SQL exécuté à distance ; aucun déploiement.

## Adaptation de l’administration

- Compilation et ESLint réussis après modification du tableau de bord.
- Six tests automatisés de données réussis : branches Oui/Non, données nulles ou JSON irrégulier, pagination, erreurs et exports.
- Migration 006 testée sur PostgreSQL embarqué avec Auth simulée : insertion publique conservée, lecture anonyme refusée, user_metadata sans effet, lecture admin autorisée, modification/suppression refusées et ancienne règle permissive contenue. Script relançable.
- Dernier contrôle distant : lecture anonyme refusée (401/42501), sans lecture de dossiers. Aucun compte administrateur réel utilisé ; activation SQL distante non effectuée.
- Parcours navigateur mis à jour, mais non revalidés dans Chrome depuis son blocage SIGABRT/EPERM signalé précédemment.

## Suppression — 16 octobre 2026

Compilation, ESLint et 8 tests de données réussis. SQL local : refus anonyme et non-admin (y compris user_metadata falsifié), suppression admin ciblée, autre dossier préservé, politique permissive antérieure limitée et migration relançable. Les 10 tests navigateur de l’administration n’ont pas pu démarrer : Chrome SIGABRT/EPERM. Aucun dossier distant supprimé. Migration de suppression encore à appliquer sur le nouveau projet.

## Édition — 21 octobre 2026

- Compilation et ESLint réussis.
- 13 tests de données réussis : données préservées, ajouts/retraits, compteurs, références de personnes, erreurs et conflits.
- Trois scénarios navigateur d’édition réussis : sauvegarde/relecture et gestion des permissions et conflits.
- Vérification élargie : 16 scénarios réussis. Deux anciens tests du formulaire attendaient « Confirmez votre réponse » au lieu du titre actuel « Confirmez votre place » ; attentes corrigées. Leur relance a été bloquée au démarrage de Chrome (SIGABRT/EPERM), donc elle n’est pas déclarée réussie.
- PostgreSQL local : seuls les admins peuvent mettre à jour les colonnes autorisées ; horodatage serveur, rejet de version périmée, autre ligne préservée et migration relançable vérifiés.
- SQL distant non exécuté ; aucune vraie soumission modifiée. Exécuter 202610210001_admin_update_confirmations.sql sur le nouveau projet pour activer l’édition.
