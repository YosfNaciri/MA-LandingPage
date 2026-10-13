# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Navigation

Le point d’entrée `src/main.tsx` utilise `BrowserRouter`. Les routes sont définies dans `src/App.jsx` :

- `/` : page d’accueil.
- `/confirmation-client` : page de confirmation client.
- Toute autre adresse affiche une page introuvable.

La page de confirmation est dans `src/pages/ConfirmationClient.jsx`. Elle contient le formulaire natif de confirmation des impôts 2026. Les formulaires Fillout de l’accueil restent indépendants.

En production, configurez l’hébergement pour servir `index.html` pour les chemins qui ne correspondent pas à un fichier, afin que l’accès direct et le rafraîchissement de `/confirmation-client` fonctionnent. Vite gère ce comportement en développement et en prévisualisation.

## Connexion à la table existante

Le formulaire public `/confirm-client` (alias `/confirmation-client`) enregistre directement dans `public.client_tax_season_confirmations`, sans invitation ni connexion.

Le schéma utilisé est celui contenant `tax_year`, `first_name`, `last_name`, `people_count`, `yes_data` et `no_data`. Les réponses conditionnelles, particularités, identification partielle et préférences sont conservées dans `yes_data` pour Oui ou `no_data` pour Non. Les personnes restent dans `people`. L’administration traduit ces données pour conserver les détails et les exports.

Configurer `.env.local` avec l’URL et la clé publishable du projet contenant cette table, puis redémarrer Vite. `npm run check:supabase` vérifie toutes les colonnes sans lire de dossier.

Pour la table déjà créée : ne pas exécuter les anciennes migrations 001 à 004, qui correspondent à l’ancien schéma proposé. Si l’envoi est refusé par RLS, exécuter `supabase/enable-existing-form.sql` dans le SQL Editor du NOUVEAU projet. Ce script autorise la création publique et réserve la lecture aux comptes dont app_metadata.role vaut admin. Utiliser `supabase/grant-confirmation-admin.sql` pour attribuer ce rôle au compte choisi.

La page de réussite apparaît après acceptation de l’insertion par Supabase. En cas d’échec, les champs restent présents. Tests : `npm run build`, `npm run lint`, `npm run test:e2e`. Aucun déploiement automatique.

## Administration — configuration et utilisation

1. Dans le nouveau projet Supabase, créer un utilisateur dans **Authentication → Users**.
2. Si les permissions du formulaire n’ont pas encore été configurées, exécuter `supabase/enable-existing-form.sql`. Sinon, exécuter uniquement `supabase/migrations/202610130006_admin_current_schema.sql` : ce script conserve les droits d’insertion et réserve la lecture aux administrateurs. Il peut être relancé. Ne pas rejouer les anciennes migrations 001 à 004 sur cette table.
3. Remplacer le courriel dans `supabase/grant-confirmation-admin.sql` par celui du compte créé, puis exécuter ce script dans le SQL Editor du nouveau projet.
4. Se déconnecter puis se reconnecter sur `/admin/login` pour obtenir un jeton portant le rôle admin. Les comptes et mots de passe de l’ancien projet ne sont pas transférés.

Le tableau de bord utilise les colonnes réelles : noms, année fiscale, personnes, détails Oui/Non, statut et dates. Les filtres portent sur la recherche du client et la saison fiscale. Les totaux Oui et Non ignorent les réponses non renseignées.

CSV et Excel exportent toutes les confirmations accessibles, indépendamment des filtres, avec statut et dates de suivi. Le NAS partiel et les téléphones conservent leurs zéros dans Excel. Les anciens dossiers incomplets restent consultables. Aucun bouton de suppression ou de modification des réponses n’est ajouté.

`npm run test:admin-data` vérifie la lecture, les données incomplètes, les réponses Oui/Non, la pagination et les exports. `npm run test:e2e` couvre connexion, droits, détails, filtres et téléchargements avec une API simulée.

Les protections dans l’interface ne remplacent pas les règles RLS. Seul `app_metadata.role = admin` accorde la lecture ; `user_metadata` n’accorde aucun accès. Les scripts SQL sont fournis et ne sont pas appliqués automatiquement à Supabase.
