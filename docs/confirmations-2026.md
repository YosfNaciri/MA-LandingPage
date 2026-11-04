# Évolution du formulaire d’intention — 26 octobre 2026

## Périmètre et audit

Implémentation du document « Formulaire Impôts 2026 — Modifications nouvelles demandes », daté du 23 octobre 2026. Le code, le README et les migrations antérieures ont été examinés avant modification. L’état Git initial était propre. Les tables et parcours d’ouverture de dossiers historiques restent en place ; aucune refonte du site.

La sonde distante en lecture seule (`node scripts/check-supabase.mjs`) a reçu HTTP 401 / code 42501 avec la configuration publique disponible. **Le schéma, les politiques et les données de production ne sont donc pas certifiés.** Aucun SQL distant, déploiement ni envoi réel n’a été exécuté. Les anciennes migrations ne doivent pas être utilisées pour reconstruire une base déjà en service.

## Changements livrés

- Même formulaire et thème pour les deux entrées, avec `new_client` / `returning_client`, liens et retour hors cadre conservés.
- Textes T1 à T6, échéance du 30 novembre 2026, question « vos impôts 2025 », avertissements conditionnels et récapitulatif Nom · Relation · Statut.
- Règles communes dans `supabase/functions/_shared/confirmationRules.js`, réexportées côté navigateur. SQL équivalent vérifié par les mêmes scénarios. Le conjoint suit le répondant, y compris lorsqu’il change. Une réponse manquante reste À vérifier.
- Option sans courriel pour Oui et Non ; les refus ne participent pas à la capacité.
- Confirmation A/B/Non et courriel construits par le même module à partir d’un instantané serveur ; les protections des pages de succès sont conservées.
- Trois vues `/admin/people?status=confirmed`, `verify`, `review` : filtres recherche/saison/type de client, décisions et suivi manuel horodatés, export Excel filtré avec une ligne par personne et les coordonnées du répondant.
- Export global des confirmations conservé (CSV/Excel, sélection de colonnes, dates jj/mm/aaaa UTC), complété des statuts/compteurs. Les exports filtrés sont distincts. Protection des formules conservée.
- Suivi de l’accusé automatique et reprise accessible dans le détail d’une confirmation ; ce suivi ne remplace pas la réponse manuelle du cabinet.

## Sources de vérité et compatibilité

`client_tax_season_confirmations` reste la table des réponses. `people` reste la source des noms, relations, réponses 2025 et informations historiques. Le navigateur écrit uniquement cette réponse via la RPC pour un nouvel enregistrement, et conserve l’édition existante pour les modifications. Il n’écrit jamais indépendamment les personnes.

Un déclencheur serveur valide et recalcule les statuts/compteurs, puis projette les personnes dans `client_confirmation_people`, dans la **même transaction**. La paire `(response_id, person_key)` est unique. Les suppressions sont propagées, les décisions préservées lors d’un changement de réponse 2025 ou de relation. Les modifications concurrentes utilisent le `updated_at` existant pour la réponse et une `version` pour les décisions. Les liens des particularités restent attachés aux identifiants de personne.

La table liée est seule source des décisions et du suivi manuel. Les valeurs sont null, Accepté, Refusé, Client 2025 confirmé après vérification. La date change lorsque la décision change ; décocher le suivi retire sa date. Il ne s’agit pas d’un historique complet de toutes les décisions.

La reprise initiale conserve le JSON et les dates historiques. Elle crée des clés déterministes pour les anciennes personnes sans identifiant et préserve les champs supplémentaires dans `source_data`. Des données non objet ne deviennent pas des personnes fictives. Les réponses Non ne créent aucune personne dans la projection. Les anciens accusés sont marqués `skipped_legacy` : aucun envoi rétroactif.

Le statut technique `status`, le type de client, le statut calculé individuel et la décision du cabinet restent quatre notions différentes. La capacité actuelle est uniquement le nombre de statuts calculés Confirmé. Aucun effet implicite des décisions sur ce total.

## Migrations : procédure à approuver avant toute action distante

1. Exécuter **en lecture seule** `supabase/audit-confirmations-readonly.sql` dans la base actuelle. Comparer les colonnes, contraintes, politiques, droits et déclencheurs à ceux attendus par le code. Vérifier notamment `yes_data`, `no_data`, `people`, `updated_at`, `client_type`, les droits admin et la nullabilité du courriel. Examiner les réponses historiques signalées sans exporter de renseignements personnels dans les journaux.
2. Présenter ce résultat et les trois fichiers SQL ci-dessous au propriétaire et obtenir son accord explicite. Prendre la sauvegarde habituelle avant le changement approuvé. Ne pas lancer un `db push` qui appliquerait les anciennes migrations non inscrites dans l’historique distant.
3. Appliquer uniquement, dans cet ordre exact :
   - `supabase/migrations/202610260001_confirmation_people.sql`
   - `supabase/migrations/202610260002_confirmation_receipts.sql`
   - `supabase/migrations/202610290001_confirmation_receipts_brevo.sql`
4. Vérifier les nombres de personnes Oui attendus, l’absence de doublons, les droits admin et l’absence de lecture publique. Tester les déclencheurs dans un environnement de validation avant production. Ne pas rejouer ces migrations déjà appliquées : elles sont transactionnelles et destinées à une application unique.
5. Déployer le frontend après les migrations. Le nouveau formulaire exige `submit_tax_confirmation`; sans cette RPC il affiche une erreur et n’annonce pas un succès fictif. Le frontend ancien reste compatible avec les colonnes existantes, sous réserve des validations serveur désormais appliquées aux écritures.
6. Déployer la fonction et configurer son ordonnanceur seulement après accord. L’envoi reste désactivé tant que `RECEIPT_EMAIL_ENABLED` n’est pas exactement `true`.

Changements SQL exacts : deux colonnes nullable et un index unique partiel sur les réponses ; deux nouvelles tables avec RLS ; fonctions de calcul, validation, synchronisation, soumission idempotente et gestion de file ; déclencheurs associés ; projection initiale et accusés historiques ignorés. Aucune suppression/recréation de table existante, aucun changement de compte, aucune modification des politiques historiques de la table des réponses. Les nouvelles politiques emploient le rôle administrateur existant dans `app_metadata.role`, jamais `user_metadata`.

La précondition SQL ne remplace pas l’audit distant. Si un droit légitime existant repose sur une autre règle que `app_metadata.role = admin`, adapter les nouvelles politiques à ce droit vérifié avant application, sans élargir l’accès public.

## Accusés automatiques : configuration serveur

Fonction : `supabase/functions/send-confirmation-receipts/index.ts`. Le prestataire implémenté est Brevo (API transactionnelle). L’adresse d’expédition doit utiliser un domaine autorisé et vérifié.

| Variable | Où / rôle |
| --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Configuration publique actuelle, inchangée |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Environnement serveur Supabase uniquement, normalement injecté par la plateforme |
| `RECEIPT_EMAIL_ENABLED` | Secret serveur ; `false` pendant développement/validation, `true` uniquement après accord d’activation |
| `BREVO_API_KEY` | Clé API Brevo (pas une clé SMTP), jamais `VITE_` |
| `RECEIPT_FROM_EMAIL` | Expéditeur validé, par exemple nom actuel et adresse du domaine autorisé |
| `RECEIPT_WORKER_SECRET` | Secret aléatoire long partagé seulement avec l’ordonnanceur |
| `CABINET_NAME` | Option serveur facultative ; nom actuel par défaut. Pour un changement validé, modifier aussi la constante commune `BUSINESS_NAME` afin de garder l’écran cohérent |

Un ordonnanceur serveur appelle chaque minute en POST l’URL `https://<projet>.supabase.co/functions/v1/send-confirmation-receipts` avec `Authorization: Bearer <RECEIPT_WORKER_SECRET>`. Ne jamais placer ce secret dans le frontend, une URL ou le dépôt. Supabase Cron/Vault ou l’ordonnanceur sécurisé existant peuvent remplir ce rôle ; aucun cron ni extension n’est installé automatiquement par les migrations. `supabase/config.toml` désactive la vérification JWT pour cette seule fonction : l’accès est protégé par le secret dédié contrôlé dans le code. Chaque appel traite au plus dix accusés. Garder l’ordonnanceur désactivé pendant la validation.

La réponse, ses personnes et la file sont enregistrées atomiquement avant l’envoi. Le token aléatoire conservé dans la session du navigateur empêche les doubles clics/reprises d’une même soumission ; il ne fusionne pas arbitrairement deux réponses distinctes faites depuis des appareils différents. Une reprise avec le même token et un contenu différent est rejetée.

L’accusé garde l’instantané de la soumission initiale. Une modification administrative ne renvoie pas automatiquement un nouveau courriel. Le contenu complet destiné au prestataire est figé avant la première tentative pour conserver la même clé et le même corps lors des reprises.

Les états sont `queued`, `sending`, `sent`, `failed`, `manual_review`, `skipped_no_email`, `skipped_legacy`. Un verrou à durée limitée protège les traitements concurrents. Les échecs sont repris après cinq minutes ; le bouton admin permet de planifier une reprise immédiate. La protection Brevo dure 15 minutes ([documentation officielle](https://developers.brevo.com/changelog/2021/11/10)) : après 14 minutes à compter de la première tentative, une livraison incertaine passe en vérification manuelle et n’est plus renvoyée automatiquement. Vérifier chez le prestataire avant toute intervention manuelle ; ne pas effacer l’instantané ou générer une nouvelle clé au hasard.

`sent` signifie accepté par le prestataire, pas preuve de réception dans la boîte du client. Le traitement des rebonds et une confirmation de livraison nécessiteraient un webhook supplémentaire. Les erreurs techniques contiennent uniquement des codes, sans noms, courriels ou corps de message. Une panne d’envoi ne supprime jamais une réponse.

## Validation locale et limites

Commandes :

```sh
npm run test:admin-data
npm run test:sql
npm run test:e2e
npm run lint
npm run build
```

Résultat local du 26 octobre 2026 : 33 tests unitaires, 17 tests SQL et 48 tests navigateur réussis ; lint, compilation TypeScript/Vite et contrôle des espaces Git réussis. Vite signale un bundle supérieur à 500 kB (avertissement, pas une erreur).

Les tests SQL utilisent PostgreSQL embarqué PGlite dans une base jetable, avec un schéma de référence du contrat frontend actuel. Ils exécutent les trois migrations et vérifient la reprise, l’idempotence, les règles serveur, les droits, la cohérence des projections, les décisions, les conflits, les suppressions et les reprises d’envoi. Ils ne certifient pas le schéma Supabase distant.

Les tests navigateur interceptent Supabase et les tests du worker injectent un prestataire simulé : aucun courriel réel. Les scénarios du document couvrent répondant seul, conjoint, enfant nouveau, parent inconnu, répondant nouveau et conjoint, changement Non → Oui, suppression, absence de courriel, refus et mobile. S’y ajoutent les deux parcours, l’accès direct au succès, les exports globaux/filtrés, les décisions, leurs conflits et les largeurs mobiles 375/412 px. Les règles partagées et le worker sont exécutés en JavaScript local ; le runtime Edge Deno et l’intégration distante du prestataire restent à valider avant activation.

## Points métier à valider

- Nouveau nom commercial non fourni : nom actuel conservé, constante commune prête à être remplacée. Phrase optionnelle de Gabriel non ajoutée.
- L’effet d’Accepté/Refusé ou de « Client 2025 confirmé après vérification » sur le bilan de capacité n’est pas défini. Les champs sont disponibles, sans changement du statut calculé ni falsification de la réponse 2025.
- T2 annonce le conjoint inclus, alors que la règle précise une exception si le répondant n’est pas confirmé. La règle explicite du conjoint prévaut pour le calcul ; le texte T2 prescrit est conservé.
- Les avertissements prescrits parlent de « place » pour les demandes malgré une consigne rédactionnelle générale contraire. Les textes imposés ont été conservés, pronoms adaptés. L’avertissement hérité par un conjoint peut aussi demander une formulation spécifique si sa réponse 2025 est Oui et celle du répondant Non.
- Les délais des variantes restent ceux du document : décembre pour A, avant le début de la saison pour B. Le canal, le responsable et l’organisation de la réponse ultérieure du cabinet restent à décider.
- Adresse d’expédition, domaine, prestataire et activation de l’ordonnanceur restent à configurer/valider.


## Activation avec Brevo — 29 octobre 2026

1. Dans Brevo, vérifier l’expéditeur et authentifier son domaine. Créer une **clé API** dans Paramètres → SMTP & API → Clés API. Une clé SMTP utilisée pour les liens d’accès Supabase Auth n’est pas une clé API ; ne pas la remplacer dans Auth.
2. Dans Supabase → Edge Functions → Secrets, renseigner `BREVO_API_KEY`, `RECEIPT_FROM_EMAIL` (adresse seule, sans nom ni chevrons), `RECEIPT_WORKER_SECRET` et `RECEIPT_EMAIL_ENABLED=false`. `CABINET_NAME` facultatif définit le nom d’expéditeur, sinon le nom actuel est utilisé. Ne pas partager les secrets dans la conversation ou le dépôt.
3. Après audit et accord, appliquer les migrations absentes dans l’ordre indiqué ci-dessus. Si les deux migrations du 26 octobre sont déjà appliquées, appliquer seulement celle du 29 octobre. Elle remplace les fonctions de prise en charge/reprise par une fenêtre de 14 minutes. Les anciennes tâches non terminées ayant déjà un payload Resend passent en vérification manuelle, jamais en renvoi automatique via Brevo. Les accusés déjà envoyés restent envoyés. Arrêter l’ordonnanceur et laisser terminer toute invocation en cours avant le changement de prestataire.
4. Déployer la fonction existante avec `npx supabase functions deploy send-confirmation-receipts --project-ref <REFERENCE_PROJET>`, après accord. Elle utilise `https://api.brevo.com/v3/smtp/email`, `api-key`, `textContent` et enregistre le `messageId` retourné. Les textes restent construits par le module commun, aucun modèle Brevo supplémentaire n’est nécessaire.
5. Configurer l’appel Cron/Vault décrit plus haut, toujours désactivé pendant les tests. Activer `RECEIPT_EMAIL_ENABLED=true` seulement après validation ; cette activation traite les tâches en attente. Aucun appel réel à Brevo n’a été effectué pendant le développement.
6. Consulter le suivi dans l’administration et les journaux transactionnels Brevo. Après une erreur réseau incertaine, la même clé `IdempotencyKey` dans le corps JSON est conservée. Si Brevo refuse une répétition sans fournir le messageId d’origine, l’application ne prétend pas que le courriel a été confirmé envoyé : il restera à vérifier. Au-delà de 14 minutes, vérifier les journaux Brevo avant toute décision de renvoi ; ne pas remettre arbitrairement une tâche en file.

Référence du contrat API : https://developers.brevo.com/reference/send-transac-email.

## Présentation HTML des accusés

Les nouveaux accusés utilisent `receiptTemplate.js` : en-tête bleu, corps blanc, blocs bleus pour les places confirmées et ambre pour les demandes à évaluer. La variante Non utilise une présentation neutre. Le modèle reprend les paragraphes communs à l’écran et échappe les noms saisis. Aucun chargement d’image, de police externe ou script. Brevo reçoit `htmlContent` au lieu de `textContent` ; aucun modèle à créer dans Brevo.

Aperçus avec noms fictifs : [A](email-previews/A.html), [B](email-previews/B.html), [Non](email-previews/Non.html). Rendu vérifié dans Chromium à 375 et 900 px ; ce contrôle ne remplace pas une validation dans Outlook/Gmail réels.

Pour publier ce changement, redéployer seulement `send-confirmation-receipts` après accord. Aucune migration SQL ni modification de secret nécessaire. Les messages dont le contenu a déjà été figé avant une tentative conservent leur ancien format lors des reprises, afin de respecter l’idempotence. Aucun courriel déjà envoyé n’est renvoyé automatiquement.
