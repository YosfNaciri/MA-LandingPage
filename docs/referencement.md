# Référencement de martineadamcpa.com

Le 28 octobre 2026, le HTML public ne contenait ni description, ni URL canonique, ni données structurées. Il déclarait la langue anglaise et une icône SVG malgré un fichier JPEG. La page React est rendue côté navigateur.

Corrections : langue fr-CA, titre et description issus de la landing page, URL canonique, balises de partage, données WebSite avec le nom actuel, robots.txt et sitemap.xml. Le contenu et le design de la landing page restent inchangés. Les métadonnées initiales se trouvent dans index.html ; PageMetadata.jsx les adapte lors des navigations. Les formulaires, l’administration et les pages inconnues reçoivent noindex après rendu JavaScript ; cela ne remplace pas les protections d’accès existantes. Le robots.txt permet leur exploration pour que Google puisse lire noindex. Le sitemap ne contient que l’accueil et la politique de confidentialité.

## Mise en ligne (non exécutée)

1. Publier le dossier dist produit par npm run build via l’hébergement habituel, après accord du propriétaire. Publier aussi robots.txt et sitemap.xml ; ces fichiers doivent être servis directement, avant la règle de réécriture SPA. Ne pas remplacer sitemap.xml par index.html.
2. Vérifier sur https://martineadamcpa.com/ le titre, la description et le canonical dans le code source, puis ouvrir /robots.txt et /sitemap.xml. Purger le cache de l’hébergement si nécessaire.
3. Dans Google Search Console, sélectionner la propriété du domaine, inspecter https://martineadamcpa.com/, tester l’URL publiée puis demander son indexation.
4. Dans Sitemaps, soumettre https://martineadamcpa.com/sitemap.xml.
5. Vérifier le rendu JavaScript via l’inspection d’URL et l’évolution de l’indexation. Google détermine son propre extrait et peut conserver temporairement l’ancienne présentation. Une demande d’indexation ne garantit ni une mise à jour immédiate, ni un texte strictement identique.

Les pages secondaires reçoivent leurs métadonnées via JavaScript car l’hébergement actuel sert un HTML SPA partagé. Pour des en-têtes noindex avant rendu, configurer X-Robots-Tag sur les routes administratives et de formulaire dans l’hébergement, en fonction de son fournisseur. Aucune configuration spécifique à un hébergeur n’a été inventée.

Références : https://developers.google.com/search/docs/appearance/snippet et https://developers.google.com/search/docs/appearance/title-link.


## Retirer les confirmations des résultats (28 octobre 2026)

Les configurations `.htaccess` (Apache/Cloudways) et `vercel.json` ajoutent désormais `X-Robots-Tag: noindex, follow` aux chemins `/confirm-client` et `/confirmation-client`, ainsi qu’à leurs sous-pages. Publier la configuration correspondant à l’hébergement : Vite ne copie pas le `.htaccess` racine dans `dist`, il faut donc le transférer à la racine web avec les fichiers compilés. Ces en-têtes doivent être vérifiés en ligne après déploiement ; ils n’ont pas été testés sur un serveur Apache/Vercel distant. Ne pas bloquer ces URL dans robots.txt : Google doit pouvoir lire noindex.

Pour accélérer le retrait du résultat déjà présent, utiliser Search Console → Suppressions → Nouvelle demande → Supprimer temporairement, pour les préfixes `https://martineadamcpa.com/confirm-client` et `https://martineadamcpa.com/confirmation-client`. Vérifier aussi l’URL HTTP signalée dans le résultat. Ne pas demander le retrait du domaine entier. Le retrait temporaire dure environ six mois ; l’en-tête noindex maintient l’exclusion après réexploration tant qu’il reste en place. Aucun retrait Search Console n’a été exécuté automatiquement.
