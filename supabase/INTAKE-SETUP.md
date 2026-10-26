# Ouverture de dossier

Les routes `/demande-acces` et `/ouverture-dossier` utilisent le même projet Supabase que les confirmations et l’administration, configuré dans `.env.local`. Aucune clé secrète n’est nécessaire dans le navigateur.

## Installation sur le projet Supabase cible

1. Exécuter `migrations/202610220001_client_intake.sql` dans SQL Editor, ou appliquer cette migration avec votre procédure habituelle. Elle crée deux nouvelles tables et le bucket privé `intake-documents`, sans modifier les confirmations. Si des tables de ces noms existent déjà, comparer leur schéma avant migration : le script échoue volontairement au lieu de modifier silencieusement une table existante.
2. Dans Authentication, activer Email et autoriser les inscriptions : le code fourni utilise `shouldCreateUser: true`.
3. Dans Authentication → URL Configuration, renseigner l’URL du site et ajouter les redirections exactes : `https://VOTRE-DOMAINE/ouverture-dossier`, ainsi que `http://localhost:5173/ouverture-dossier` pour le développement (adapter au port utilisé).
4. Conserver un modèle d’email Magic Link contenant `{{ .ConfirmationURL }}`. Configurer le SMTP pour l’envoi aux clients.
5. Vérifier avec deux comptes réels : demande de lien, réception, ouverture du formulaire, envoi avec pièce jointe, retour à Mon dossier, téléchargement et déconnexion. Le compte B ne doit pas lire les lignes ou fichiers du compte A, ni écrire un document rattaché au dossier A.

Les clients peuvent uniquement créer et lire leurs dossiers et documents. Le stockage utilise `user_id/submission_id/fichier` et les liens de consultation expirent après cinq minutes. Pour la vue administrateur, exécuter ensuite `migrations/202610230001_admin_intake_read.sql` dans SQL Editor. Cette migration autorise uniquement les comptes dont `app_metadata.role` vaut `admin` à lire tous les dossiers, leurs documents et les fichiers du bucket privé. Elle ne modifie pas les droits des clients ni ceux des confirmations. Réutiliser les comptes administrateurs existants.

Le formulaire source est repris sans changement de logique métier. Son envoi historique comporte plusieurs opérations successives (dossier, pièces jointes, Excel), sans transaction globale : une erreur de téléversement peut laisser un dossier partiellement enregistré. L’intégration ne modifie pas ce comportement.

Le code Power Automate du formulaire source reste conservé, avec son bouton désactivé comme dans la source ; son activation nécessiterait sa configuration séparée. Le parcours principal enregistre dans Supabase.

La migration et les paramètres Auth doivent être appliqués sur le serveur avant utilisation réelle. Les tests automatisés du navigateur simulent Supabase et ne prouvent pas la configuration du serveur ni la livraison des emails.

Références : [Magic Link](https://supabase.com/docs/guides/auth/auth-email-passwordless), [redirections](https://supabase.com/docs/guides/auth/redirect-urls).

## Tableau de bord identique au projet source

Après les deux migrations précédentes, exécuter `migrations/202610230002_admin_intake_dashboard.sql` dans SQL Editor. Ce script ajoute `updated_at`, la table `client_intake_status_history`, la modification du seul champ `status` pour les administrateurs et un trigger qui enregistre chaque changement dans la même transaction. Les clients ne peuvent ni changer les statuts, ni consulter ou écrire l’historique.

L’espace admin reprend les pages du projet source : `/admin/dashboard` (statistiques et activités récentes), `/admin/submissions` (dossiers, statuts, aperçus, ZIP et Excel), `/admin/confirmations` (confirmations existantes) et `/admin/logs` (50 dernières soumissions et 50 derniers changements). La base actuelle et les comptes administrateurs existants sont conservés. Aucun de ces scripts n’est appliqué automatiquement au serveur.

## Formulaire commun aux nouveaux et anciens clients (25 octobre 2026)

Exécuter `migrations/202610250001_confirmation_client_type.sql` sur la base actuelle **avant de publier le frontend**. La colonne `client_type` accepte `new_client` et `returning_client`. Les confirmations déjà enregistrées sont classées `returning_client`, puisqu’elles provenaient du parcours ancien client. Les anciens dossiers d’ouverture restent dans leurs tables existantes.

Le choix Nouveau client pointe désormais vers `/confirmation-client/nouveau` : le même formulaire de confirmation, sans demande de lien email. Le parcours ancien client reste `/confirmation-client/formulaire`. Le tag est ajouté automatiquement à chaque réponse Oui ou Non et apparaît dans le dashboard, la liste, les détails et les exports. Il décrit le parcours déclaré par le client, sans accorder de droit d’accès.
