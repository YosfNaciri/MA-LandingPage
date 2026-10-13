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
