# F.A.N.A Multiservices

Application de gestion de magasin avec point de vente, caisse, stock FEFO, clients, fournisseurs, opérations multiservices et rapports. Les montants sont enregistrés dans le grand livre en CDF; l’affichage USD utilise un taux CDF/USD saisi par le gérant.

## Développement local

1. Utilisez Node.js 22.12+ (ou 20.19+), versions compatibles avec Vite 8.
2. Installez les dépendances : `npm install`.
3. Copiez `.env.example` vers `.env.local` et renseignez `DATABASE_URL` avec une connexion Neon. N’ajoutez jamais une vraie URL de base de données à Git.
4. Lancez `npm run dev`. Le serveur Vite inclut un middleware local pour exécuter les mêmes handlers `/api/*` que les fonctions Vercel. Les appels utilisent des URL relatives; aucun secret Neon n’est envoyé au navigateur.
5. Pour vérifier le comportement via la CLI Vercel, utilisez `npm run dev:vercel`.

Sans `DATABASE_URL`, les fonctions renvoient une erreur de configuration explicite; l’application ne charge ni ne crée de données de démonstration.

## Déploiement Vercel + Neon

1. Créez une base de données Neon et copiez sa chaîne de connexion PostgreSQL.
2. Importez ce dépôt dans Vercel.
3. Ajoutez `DATABASE_URL` aux variables d’environnement Vercel (au minimum pour Production; Preview si vous utilisez les previews).
4. Laissez Vercel utiliser le build `npm run build`. Celui-ci exécute d’abord `npm run typecheck`, puis `vite build`; le déploiement échoue si les types ne passent pas.
5. Vérifiez l’inscription, la connexion, l’ouverture de caisse, une vente, une réception de stock et un rapport après déploiement.

Le schéma Neon est initialisé de façon idempotente à la première requête. Il ne contient aucun enregistrement fictif. Les photos de produits compressées sont conservées dans la table `fana_product_images` et servies après authentification par une route de même origine; elles ne sont pas renvoyées dans chaque objet produit.

## Authentification et API interne

Les routes métier sont des fonctions serverless internes sous `api/`. Elles sont nécessaires ici pour garder la chaîne `DATABASE_URL` côté serveur, vérifier les rôles et appliquer les opérations dans des transactions. Il ne s’agit pas d’un appel à une API tierce.

**Précision importante :** le dépôt implémente actuellement sa propre authentification côté serveur (mots de passe scrypt et sessions opaques stockées dans Neon). Il ne s’agit pas encore de Neon Auth. Les tentatives de connexion et d’inscription sont limitées par IP et, pour la connexion, par adresse e-mail. Il n’y a pas encore de vérification e-mail ni de procédure de réinitialisation de mot de passe; configurez un fournisseur de courrier ou migrez vers Neon Auth avant d’ouvrir largement l’inscription publique.

## Contrôles utiles

- `npm run typecheck` : contrôle TypeScript.
- `npm run build` : contrôle TypeScript puis build de production.
- `npm run check` : même validation complète.
