# COMPARE-TECH

[![CI](https://github.com/mahamoud-diabate/COMPARE-TECH/actions/workflows/ci.yml/badge.svg)](https://github.com/mahamoud-diabate/COMPARE-TECH/actions/workflows/ci.yml)

Comparateur d'appareils technologiques (CPU, GPU, portables, téléphones) avec **verdict généré par IA**.

Monorepo réunissant le backend et le frontend dans un seul dépôt, avec l'historique Git complet des deux projets.

## En ligne

- **Frontend** — https://compare-tech-theta.vercel.app
- **API backend** — https://mahamoud-compare-tech-api.onrender.com

## Aperçu

**Parcourir** — accueil, catégories notées, puis le classement complet d'une famille de produits.

![Parcours du site : accueil, menu, classement des cartes graphiques](docs/demo-parcours.gif)

**Comparer** — deux modèles désignés à la saisie, leurs écarts chiffrés, les notes par critère et le radar de profil.

![Comparaison de deux cartes graphiques, des différences clés au radar](docs/demo-comparaison.gif)

**Chercher** — recherche instantanée sur tout le catalogue, fiche produit, thème sombre.

![Recherche instantanée, fiche produit et bascule en thème sombre](docs/demo-recherche.gif)

## Structure

```
COMPARE-TECH/
├── backend/    → API REST (Node.js · Express · MongoDB · JWT · Gemini)
├── frontend/   → Interface web (React · Vite)
├── docs/       → Charte, rapports, GIF de démonstration et scripts qui les enregistrent
└── scripts/    → Outillage du dépôt (contrôle des liens de la documentation)
```

| Document                                                                 | Contenu                                           |
| ------------------------------------------------------------------------ | ------------------------------------------------- |
| [`docs/DESIGN.md`](docs/DESIGN.md)                                       | La charte : règle de couleur, formes, typographie |
| [`docs/RAPPORT-REFONTE.md`](docs/RAPPORT-REFONTE.md)                     | Ce qui a été refait et pourquoi, pièges compris   |
| [`docs/PROPOSITIONS-AMELIORATION.md`](docs/PROPOSITIONS-AMELIORATION.md) | Feuille de route technique                        |

## Backend

```bash
cd backend
npm install
cp .env.example .env   # renseigner DB_URI, ADMIN_PASSWORD, JWT_SECRET, GEMINI_API_KEY
npm start              # http://localhost:3001
npm test               # validation, slugs, JWT (node --test, sans dépendance)
```

Routes principales : `GET /api/cpus`, `/api/gpus`, `/api/laptops`, `/api/telephones`, `/api/featured`, `POST /api/ai/verdict`, `POST /api/auth/login`.

Les quatre collections acceptent une pagination **facultative** : `GET /api/gpus?limit=50&page=2`.
Sans paramètre, la collection entière est renvoyée — c'est ce dont le frontend a
besoin pour sa recherche instantanée. La réponse reste un tableau dans les deux
cas ; quand la pagination est demandée, le total voyage dans l'en-tête
`X-Total-Count`. `limit` est plafonnée à 200.

## Frontend

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
npm test               # logique de comparaison (node --test, sans dépendance)
npm run lint
```

Le frontend pointe vers l'API via la variable `VITE_API_BASE` (par défaut : l'API déployée sur Render).

### Interface

Aucun framework CSS : `src/index.css` est la seule feuille de style, organisée
en un système de classes `.ct-*` (cartes, barres de score, tableaux comparatifs,
listes classées). Les couleurs passent toutes par des variables `--ct-*`
redéfinies sous `[data-theme="dark"]` — une couleur écrite en dur dans une règle
de composant casserait le thème sombre.

Trois fichiers concentrent la connaissance métier, et toute page qui affiche des
caractéristiques doit s'y référer plutôt que redéclarer sa propre liste :

| Fichier                  | Rôle                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------- |
| `src/utils/specs.js`     | Caractéristiques affichables par catégorie, benchmarks, calcul des différences clés |
| `src/utils/scores.js`    | Formules du score sur 100 et son échelle de couleur                                 |
| `src/utils/radarAxes.js` | Axes du radar et notes par critère                                                  |

Le radar est tracé en SVG par `src/components/TechRadar.jsx`, sans bibliothèque
de graphiques. Les collections sont mises en cache une minute par
`src/utils/catalog.js`, partagé entre la recherche de l'en-tête et les pages :
c'est ce qui évite qu'une même liste soit demandée deux fois par écran.

Les écrans sont chargés à la demande : `src/main.jsx` déclare chaque route avec
`React.lazy`, sauf l'accueil qui reste importé en dur pour ne pas faire
clignoter un indicateur avant le premier contenu. `App.jsx` porte le `<Suspense>`
qui couvre toutes les routes. Sans ce découpage, un visiteur de l'accueil
recevait aussi le comparateur, le radar et le panneau d'administration.

## Formatage

```bash
npm run format         # à la racine : écrit
npm run format:check   # vérifie sans écrire
```

Prettier est configuré dans `.prettierrc`, avec `.editorconfig` pour ce que
l'éditeur applique avant lui. `arrowParens: "avoid"` n'est pas un goût : c'est
la forme majoritaire dans le code existant (150 occurrences contre 48).

## Démonstrations

Les captures de l'aperçu sont produites par un script, pas à la main : une
évolution de l'interface se répercute en une commande, et les trois scénarios —
`parcours`, `comparaison`, `recherche` — restent identiques d'une version à
l'autre.

```bash
npm install            # à la racine : puppeteer-core, uniquement pour la doc
npm run demo:gif       # docs/demo-<scénario>.gif — ceux du README
npm run demo:video     # docs/demo-<scénario>.mp4 + .webm — 1080p, pour le portfolio
```

Passer un scénario en argument pour n'en rejouer qu'un : `npm run demo:gif -- comparaison`.

Les scripts attendent le site sur `http://localhost:5173` (`DEMO_URL` pour une
autre adresse), un navigateur Chromium installé (`DEMO_BROWSER` pour en imposer
un) et `ffmpeg` dans le PATH. Seuls les GIF sont versionnés : ce sont les seuls
que GitHub sait afficher dans un README. Les vidéos sont ignorées par Git et se
régénèrent à la demande.

## Intégration continue

`.github/workflows/ci.yml` s'exécute à chaque poussée et chaque pull request :

- les tests du backend, sur Node 20 et 22 ;
- le lint, les tests et le build du frontend, sur Node 20 et 22 ;
- le contrôle des liens de la documentation.

Les tests ne demandent ni base ni réseau — ils portent sur des fonctions pures.

Le contrôle des liens se lance aussi à la main :

```bash
npm run verif:liens   # à la racine
```

Il relit chaque lien Markdown relatif des fichiers suivis et échoue si l'un
d'eux ne mène nulle part. Déplacer ou supprimer un document ne casse rien de
visible : le lien reste, il ne pointe plus sur rien, et personne ne s'en aperçoit
avant de cliquer.

## Déploiement

- **Frontend** → Vercel : https://compare-tech-theta.vercel.app (`frontend/vercel.json`, root `frontend/`)
- **Backend** → Render : https://mahamoud-compare-tech-api.onrender.com (`backend/render.yaml`, root `backend/`)

## Licence

MIT — voir [LICENSE](LICENSE).

## Auteur

Mahamoud Diabaté — [github.com/mahamoud-diabate](https://github.com/mahamoud-diabate)
