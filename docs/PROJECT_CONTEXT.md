# Contexte du projet — COMPARE-TECH

> **Rôle de ce document** : source de vérité pour toute personne ou IA qui travaille sur le code de COMPARE-TECH. Il décrit **le code tel qu'il est**, puis, séparément, **les règles visées** qui ne sont pas encore implémentées.
>
> **Règle de lecture** : la section 9 (« Cible ») décrit ce qui doit être construit, pas ce qui existe. En cas de doute entre ce document et le code, **le code fait foi** : signale l'écart et corrige ce document.
>
> Dernière vérification contre le code : 30 octobre 2026.

---

## 1. Le produit

COMPARE-TECH est un comparateur de matériel (processeurs, cartes graphiques, ordinateurs portables, téléphones) en monorepo full-stack. Sa promesse tient en trois points :

1. **Des mesures, pas des fiches** : les notes reposent sur des benchmarks, jamais sur des fréquences ou des nombres de cœurs.
2. **Situer dans le marché** : chaque produit est placé parmi toute sa catégorie (« 4e sur 15 »), pas seulement face à un autre.
3. **Traçabilité** : chaque mesure porte l'URL, la date et l'extrait de texte d'où elle vient.

Positionnement : à l'opposé d'UserBenchmark (formules opaques et partisanes) et de Versus.com (comparaison de fiches constructeurs sans contexte). L'étude stratégique complète est dans `docs/COMPARE-TECH — Étude de cas stratégique.docx`.

---

## 2. Déploiements

| Élément  | Hébergement                                    | Adresse                                                                                           |
| -------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Frontend | Vercel                                         | https://compare-tech-theta.vercel.app (alias : https://compare-tech-king2mos-projects.vercel.app) |
| API      | Render, offre gratuite (`backend/render.yaml`) | https://mahamoud-compare-tech-api.onrender.com                                                    |
| Base     | MongoDB Atlas                                  | via `DB_URI`                                                                                      |
| Dépôt    | GitHub                                         | `mahamoud-diabate/COMPARE-TECH`                                                                   |

**Réglages imposés par `shared/`** (en place depuis le 30 octobre 2026) :

- **Render** : aucun Root Directory ; build `cd backend && npm ci`, démarrage `cd backend && npm start` ; filtres de build `backend/**` et `shared/**` ; variable `NODE_VERSION=22`. Un Root Directory `backend` rendrait `shared/` invisible et l'API ne démarrerait plus. Voir `backend/render.yaml`.
- **Vercel** : Root Directory `frontend`, avec « Include files outside the root directory in the Build Step » activé.

L'offre gratuite de Render met l'API en veille : le premier appel peut prendre 20 à 50 secondes. Le frontend attend jusqu'à 75 secondes (`utils/catalog.js`).

---

## 3. Stack et dépendances exactes

Node ≥ 20 partout, et **≥ 20.19 pour le backend** (il charge `shared/` par `require`, voir ci-dessous). Pas de framework de test externe : `node --test`.

**Règles partagées** (`shared/`, ESM, aucune dépendance) : critères, formules de note et statistiques de marché, importés à la fois par le backend (`require('../shared/…')`) et par le frontend (import relatif résolu par Vite). Voir 7.0.

**Backend** (`backend/package.json`, CommonJS) :

| Dépendance              | Usage                                                        |
| ----------------------- | ------------------------------------------------------------ |
| `express` 5             | API                                                          |
| `mongoose` 8            | Modèles et accès à MongoDB                                   |
| `cors`                  | Liste blanche d'origines                                     |
| `dotenv`                | Lecture de `backend/.env`                                    |
| `@google/generative-ai` | Verdict IA (Gemini)                                          |
| `axios`, `cheerio`      | Uniquement pour les scripts de relevé (`scripts/scrape*.js`) |

**Frontend** (`frontend/package.json`, ESM) :

| Dépendance                 | Usage                                           |
| -------------------------- | ----------------------------------------------- |
| `react` 19, `react-dom` 19 | Interface                                       |
| `react-router-dom` 7       | Routage (`createBrowserRouter` dans `main.jsx`) |
| `lucide-react`             | Icônes                                          |
| `react-hot-toast`          | Notifications                                   |

Outils : `vite` remplacé par `rolldown-vite` (via `overrides`), ESLint 9. À la racine : Prettier et `puppeteer-core` (enregistrement des démos de `docs/`).

Pas de framework CSS, pas de bibliothèque de graphiques : tout est en CSS natif et en SVG fait main.

---

## 4. Commandes

```bash
# Backend
cd backend
npm install
npm start                                   # node server.js (exige backend/.env)
npm test                                    # node --test (aucune base ni réseau requis)
node scripts/import.js data/cpus.json       # contrôle un fichier, n'écrit rien
node scripts/import.js data/cpus.json --verifier --ecrire   # vérifie en ligne puis écrit
node scripts/purge.js                       # compte seulement ; --yes pour vider (avec sauvegarde)

# Règles partagées
cd shared
node --test

# Frontend
cd frontend
npm install
npm run dev        # Vite ; /api passe par le proxy de vite.config.js
npm test           # node --test
npm run lint
npm run build

# Racine
npm run format:check
npm run verif:liens    # liens Markdown de la documentation
```

La CI (`.github/workflows/ci.yml`) lance, sur Node 20 et 22 : tests de `shared/`, tests backend, lint + tests + build frontend, et vérification des liens.

---

## 5. Variables d'environnement

**Backend** (`backend/.env`, modèle dans `backend/.env.example`) :

| Variable         | Rôle                                                                      | Si absente                                                     |
| ---------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `DB_URI`         | Connexion MongoDB                                                         | Le serveur refuse de démarrer                                  |
| `ADMIN_USERNAME` | Compte admin (défaut `admin`)                                             | —                                                              |
| `ADMIN_PASSWORD` | Mot de passe admin (10 caractères minimum conseillés)                     | Connexion et écritures désactivées (503)                       |
| `JWT_SECRET`     | Signature des jetons (32 caractères minimum)                              | Écritures désactivées (503)                                    |
| `GEMINI_API_KEY` | Verdict IA                                                                | `/api/ai/verdict` renvoie 503                                  |
| `GEMINI_MODEL`   | Modèle Gemini (défaut `gemini-3.8-flash`)                                 | Défaut utilisé                                                 |
| `CORS_ORIGINS`   | Origines **supplémentaires**, séparées par des virgules                   | Seules les origines de production codées en dur sont acceptées |
| `NODE_ENV`       | `production` masque les détails d'erreur et retire les origines localhost | Mode développement                                             |
| `PORT`           | Port d'écoute (défaut 3001)                                               | —                                                              |

**Frontend** : `VITE_API_BASE` (racine de l'API, **sans** `/api`). Sans valeur : chaîne vide en développement (proxy Vite), URL Render au build.

---

## 6. Architecture

```
COMPARE-TECH/
├── shared/                # RÈGLES MÉTIER COMMUNES (ESM, sans dépendance)
│   ├── criteres.js        # Chaque critère chiffré : nature, unité, sens, comparable, plafond
│   ├── formules.js        # Formules de note sur 100 et explainScore
│   ├── marche.js          # CHAMPS_MARCHE, quantiles, histogrammes, resumeMarche
│   ├── provenance.js      # Contrôle « chaque mesure a une source qui la contient » (backend ET formulaire admin)
│   ├── index.js
│   └── test/              # node --test : cohérence des critères et des formules, provenance
├── backend/
│   ├── server.js          # Démarrage seul : config, connexion MongoDB, compte admin, écoute
│   ├── app.js             # creeApp() : middlewares et routes, sans base ni réseau (testable)
│   ├── config.js          # lireConfig(env) : variables d'environnement → config + avertissements
│   ├── securite.js        # exigeAuthentification, rateLimit, stripMongoOperators, fail
│   ├── controles.js       # valideProduit : contrôles d'une fiche, communs à l'API et à import.js
│   ├── routes/            # auth.js, catalogue.js (collections + vedettes), ia.js (verdict Gemini)
│   ├── auth.js            # scrypt + JWT HS256, sans librairie
│   ├── origines.js        # LISTE BLANCHE CORS (et non la provenance des données)
│   ├── references.js      # Identifiants Mongo et slugs : formats, tri, filtres
│   ├── pagination.js      # ?limit=&page= (plafond 200), total dans X-Total-Count
│   ├── marche.js          # Réexpose shared/marche.js en CommonJS
│   ├── models/
│   │   ├── catalogue.js   # Plugin commun : slug + provenance par mesure + tolérance aux anciennes valeurs texte
│   │   └── Cpu.js, Gpu.js, Laptop.js, Telephone.js, User.js
│   ├── scripts/
│   │   ├── import.js            # Import en lot, avec les contrôles hors ligne et réseau (voir 7.3)
│   │   ├── scrapeCpus.js        # Noms de CPU depuis Notebookcheck, sans benchmark
│   │   ├── scrapeGpus.js        # Noms de GPU depuis Wikipédia, sans benchmark
│   │   ├── populateRemaining.js # ⚠ Laptops et téléphones FICTIFS ; verrouillé (voir 10)
│   │   └── purge.js             # Vidage des collections avec sauvegarde
│   ├── data/              # Fichiers d'import JSON + LISEZ-MOI.md + CONSIGNE-AGENT.md
│   └── test/              # node --test : app (API entière, faux modèles), auth, catalogue, criteres, import, marche, origines, pagination, references
├── frontend/
│   ├── src/
│   │   ├── main.jsx       # Routeur ; toutes les pages sauf l'accueil en React.lazy
│   │   ├── App.jsx        # Gabarit, thème (clair par défaut), Suspense
│   │   ├── api.js         # API_BASE, jeton admin (localStorage), adminFetch
│   │   ├── utils/
│   │   │   ├── specs.js        # Lignes affichées (intitulés, groupes) ; unité et sens lus dans shared/
│   │   │   ├── scores.js       # Réexpose les formules de shared/ ; notes-lettres, rang
│   │   │   ├── radarAxes.js    # Axes du radar ; plafonds lus dans shared/
│   │   │   ├── marche.js       # Rangs, pistes « Dans le marché », description des sources
│   │   │   ├── catalog.js      # Cache mémoire des collections (60 s)
│   │   │   ├── ficheProduit.js, liens.js, iconFiles.js
│   │   ├── components/
│   │   │   ├── marche/         # EnteteMarche, CriteresMarche, Repere, SourcesMarche
│   │   │   ├── Verdict.jsx, TechRadar.jsx, ProductList.jsx, ProductDetail.jsx, CategoryPage.jsx, …
│   │   ├── pages/              # Homepage, ComparePage, AdminPage, LoginPage, pages par catégorie
│   │   └── index.css           # Feuille unique (~2 800 lignes), classes .ct-*, variables --ct-*
│   └── test/              # node --test sur les utils (criteres, scores, specs, marche, radarAxes, ficheProduit, liens)
├── docs/                  # DESIGN.md, étude stratégique, rapports, scripts de démo
└── scripts/verifie-liens.mjs
```

**Routes du frontend** : `/`, `/cpus`, `/gpus`, `/laptops`, `/telephones` (classements), `/<catégorie>/:id` (fiche, par identifiant ou slug), `/compare?type=…&ids=…`, `/login`, `/admin` (protégée).

---

## 7. Logique métier

### 7.0 Où vit chaque règle

| Règle                                                                         | Fichier qui fait foi                                       |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Ce qui est stocké (champs, types, plages)                                     | `backend/models/*.js`                                      |
| Ce que veut dire une mesure (nature, unité, sens, comparable ou non, plafond) | `shared/criteres.js`                                       |
| Comment se calcule une note                                                   | `shared/formules.js`                                       |
| Comment se résume une collection                                              | `shared/marche.js`                                         |
| Comment c'est affiché (intitulés, groupes, ordre, aides)                      | `frontend/src/utils/specs.js`, `radarAxes.js`, `marche.js` |

`specs.js`, `radarAxes.js`, `CHAMPS_MARCHE` et la liste des champs envoyés à l'IA (`AI_FIELDS`) **dérivent** de `shared/criteres.js` : ne jamais y recopier une unité, un sens ou un plafond. Trois suites de tests vérifient l'alignement : modèles ↔ critères (`backend/test/criteres.test.js`), critères ↔ formules et marché (`shared/test/`), critères ↔ affichage (`frontend/test/criteres.test.js`).

### 7.1 Champs réellement stockés

Une caractéristique n'existe sur le site que si elle existe dans le modèle Mongoose.

| Catégorie | Champs chiffrés                                                                                              | Autres champs                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| CPU       | `cores`, `threads`, `base_freq_ghz`, `max_freq_ghz`, `tdp_w`, `geekbench_single`, `geekbench_multi`          | `name`, `brand`, `imageUrl`, `pros`, `cons`                                            |
| GPU       | `cores` (unités de calcul), `memory_gb`, `tdp_w`, `benchmark_3dmark`                                         | `memory_type`, `name`, `brand`, …                                                      |
| Laptop    | `ram_gb`, `storage_gb`, `geekbench_multi`, `display_brightness_nits`, `battery_life_hours`                   | `cpu_name`, `gpu_name`, `cpu` et `gpu` (références vers les collections CPU et GPU), … |
| Téléphone | `display_size`, `ram_gb`, `storage_gb`, `battery_mah`, `antutu_score`, `geekbench_single`, `geekbench_multi` | `cpu_name`, `cpu` (référence), …                                                       |

Le plugin `catalogue.js` ajoute à chaque modèle `slug` (unique, dérivé du nom) et `provenance`.

**N'existent pas** (ne pas les afficher ni les supposer) : cache L3, bus mémoire et bande passante GPU, TGP, taille d'écran et poids des laptops, batterie en Wh, fréquence d'écran, luminosité et capteur photo des téléphones, puissance de charge.

Les unités de calcul GPU (`cores`) s'affichent sans gagnant : un cœur CUDA et un stream processor ne se comparent pas.

### 7.2 Notes sur 100 (`shared/formules.js`)

Chaque terme vaut `(valeur / plafond) × 100 × poids`, et le total est plafonné à 100.

| Catégorie | Formule                                        | Plafonds       | Données manquantes                   |
| --------- | ---------------------------------------------- | -------------- | ------------------------------------ |
| CPU       | 70 % Geekbench 6 multi + 30 % Geekbench 6 mono | 29 000 / 3 500 | Les deux exigées, sinon « non noté » |
| GPU       | 100 % `benchmark_3dmark`                       | 35 000         | « Non noté » si absent               |
| Laptop    | 100 % Geekbench 6 multi                        | 26 000         | « Non noté » si absent               |
| Téléphone | 70 % Geekbench 6 multi + 30 % mono             | 9 500 / 3 600  | Les deux exigées                     |

- Une note de **0 signifie « non mesurable »**, jamais « mauvais ». Les produits non notés sont exclus des rangs et des médianes.
- Les téléphones sont notés sur Geekbench et non sur AnTuTu, qui n'utilise pas la même API graphique sur Android et iOS. AnTuTu reste affiché.
- Les plafonds sont déclarés une seule fois, dans `shared/criteres.js` ; les notes, le radar et les barres de benchmark les y lisent.
- Notes-lettres : A+ ≥ 90, A ≥ 70, B ≥ 50, C ≥ 30, D ≥ 1.

### 7.3 Provenance des données

Chaque mesure chiffrée porte une entrée dans `provenance`, indexée par le nom du champ :

```json
"provenance": {
  "geekbench_multi": {
    "url": "https://www.notebookcheck.net/…",
    "releve_le": "2026-10-29",
    "extrait": "HP EliteBook 8 G2a 14AMD Ryzen AI 7 450 13611 Points"
  }
}
```

Les champs obligatoires sont `url`, `releve_le` et `extrait`. Quatre champs **facultatifs** qualifient la valeur (phase 1 de [`PROPOSITION-MESURE.md`](PROPOSITION-MESURE.md)) :

- `origine` : `constructeur`, `laboratoire` ou `agregat` (liste `ORIGINES` de `shared/criteres.js`) ;
- `protocole` : le test exact, pris dans la liste `protocoles` du critère, dont le premier est la référence. Une caractéristique de fiche technique n'en a pas ;
- `version` : la sous-version du test, si la source la donne ;
- `archive` : l'URL d'une copie archivée de la page.

Absents, rien n'est exigé ; présents, ils sont contrôlés (`controleQualification`, `shared/provenance.js`), et une clé de source inconnue est refusée plutôt que perdue. Les règles de comparaison par protocole ne s'appliqueront qu'en phase 3, une fois le catalogue de test remplacé.

**Où c'est vérifié** : toute écriture passe par `valideProduit` (`backend/controles.js`), qui applique les trois contrôles hors ligne :

1. provenance obligatoire (URL, date lisible, extrait), avec la valeur présente, isolée, dans son propre extrait (`shared/provenance.js`) ;
2. nom et marque obligatoires, refus des champs inconnus du modèle ;
3. plages de validité des modèles.

Ils s'appliquent à `scripts/import.js` **et** aux routes d'écriture de l'API (`POST`/`PUT /api/:segment`), donc au panneau d'administration. Une valeur vide (`null`, `''`) n'exige pas de source.

`scripts/import.js` ajoute trois contrôles réservés à l'import en lot :

4. option `--verifier` : l'extrait doit figurer sur la page téléchargée ;
5. quarantaine des mesures qui bougent de plus de 10 % par rapport à la base ;
6. signalement des valeurs incohérentes avec la médiane du lot.

**Écritures par l'API** : une fiche refusée renvoie `400 { error, erreurs: [motifs] }`. Un lot est accepté **en entier ou pas du tout** (motifs préfixés `#n (nom)`). Un `PUT` est contrôlé sur la fiche complète qu'il produira ; sa provenance est **fusionnée** avec l'existante, si bien qu'on peut modifier une mesure en n'envoyant que la source de celle-ci.

**Formulaire admin** : chaque mesure renseignée a ses champs URL, date (pré-remplie au jour) et extrait, avec une vérification en direct (« ✓ La valeur figure dans l'extrait » / « ✗ … le serveur refusera ») ; les motifs de refus du serveur s'affichent sous le formulaire. Les 53 fiches de production passent ces contrôles (vérifié le 30 octobre 2026).

Côté interface, `SourcesMarche.jsx` et la fiche produit affichent pour chaque valeur le site, la date de relevé, le test et l'origine, avec l'extrait au survol (`decrireSource` dans `utils/marche.js`). **Une valeur sans provenance affiche « Source non renseignée » : aucune source n'est attribuée par défaut.** Les intitulés ne disent « mesurée » ou « annoncée » que si l'origine de la source l'établit (`qualificatifOrigine`).

### 7.4 Comparateur « Dans le marché » (`pages/ComparePage.jsx`)

La page charge les produits comparés (`POST /api/:segment/compare`) **et la collection entière** (`loadCatalog`), puis calcule tout côté client. Trois blocs :

1. **`EnteteMarche`** : note sur 100, rang dans la catégorie (« 4e sur 15 », « Top X % » au-delà de 100 produits), axe des notes du catalogue, avantages de chacun, classement complet dépliable.
2. **`CriteresMarche`** : chaque critère chiffré de `specs.js` une seule fois, avec sa piste placée dans le catalogue. **Plus à droite = meilleur**, y compris pour la consommation (`invert: true`). Filtre « écarts ≥ 10 % ».
3. **`SourcesMarche`** : tiroir fermé par défaut, avec la formule de la note, le tableau complet et les sources.

Pistes (`preparerPiste`) : `paliers` jusqu'à 12 valeurs distinctes, `points` jusqu'à 40 mesures, `colonnes` au-delà (axe borné entre P2 et P98).

**Règles de départage actuelles** :

- `winnerIndex` (`specs.js`) : le plus grand l'emporte, sauf égalité **exacte**.
- `buildKeyDifferences` et `buildStrengths` : un écart inférieur à 3 % est ignoré.
- Badge « Meilleure note » (`EnteteMarche`) : égalité **exacte** de note seulement.
- Rang « sportif » : deux valeurs égales partagent le même rang.

**Classements filtrés** (`ProductList.jsx`) : sans filtre, rang dans tout le catalogue ; avec un filtre actif, le rang est recalculé parmi les produits filtrés (« 8 modèles · rang sur ces 8 »). C'est voulu : ne pas « corriger ».

### 7.5 Verdict IA (`POST /api/ai/verdict`, `components/Verdict.jsx`)

- Déclenché **à la demande** par l'utilisateur, après les mesures, et présenté comme « non une mesure ».
- Le serveur ne transmet qu'une liste blanche de champs (`AI_FIELDS`), avec les chaînes tronquées à 120 caractères.
- Le prompt demande un verdict court, honnête, en français, et interdit de suivre des instructions contenues dans les données.
- Réponse : `{ "aiResponse": "…" }`. Limite : 20 appels par heure et par IP.
- **Pas** de cache, **pas** de profil d'usage, **pas** de vérification des chiffres cités par le modèle.

### 7.6 Résumé statistique (`shared/marche.js`, réexposé par `backend/marche.js`)

`GET /api/:segment/marche` renvoie, par critère, min, max, P2, P25, P50, P75, P98, histogramme ou paliers, avec un cache serveur d'une heure. Les critères sont listés dans `CHAMPS_MARCHE`, dérivé des critères `comparables` de `shared/criteres.js`.

> ⚠ **Le frontend n'appelle pas encore cette route** : `ComparePage` et `Header` chargent les collections complètes. Le cache n'est pas invalidé après une écriture.

---

## 8. API REST

| Méthode  | Route                   | Rôle                                                                            |
| -------- | ----------------------- | ------------------------------------------------------------------------------- |
| `GET`    | `/api/health`           | État de l'API et de la connexion MongoDB                                        |
| `POST`   | `/api/auth/login`       | Connexion admin → `{ token }` (10 essais / 15 min)                              |
| `GET`    | `/api/featured`         | Meilleur produit de chaque catégorie (page d'accueil)                           |
| `GET`    | `/api/:segment`         | Collection entière ; avec `?limit=&page=` : paginée, total dans `X-Total-Count` |
| `GET`    | `/api/:segment/marche`  | Résumé statistique (voir 7.6). **Déclarée avant `/:id`** : ne pas réordonner    |
| `GET`    | `/api/:segment/:id`     | Fiche par identifiant Mongo **ou** par slug                                     |
| `POST`   | `/api/:segment/compare` | Corps `{ "ids": [...] }`, identifiants ou slugs, 10 au maximum                  |
| `POST`   | `/api/ai/verdict`       | Corps `{ "product1": {...}, "product2": {...} }`                                |
| `POST`   | `/api/:segment`         | Admin. Un objet, ou un tableau de 500 au plus. Contrôlé (7.3), tout ou rien     |
| `PUT`    | `/api/:segment/:id`     | Admin. Contrôlé sur la fiche résultante (7.3), provenance fusionnée             |
| `DELETE` | `/api/:segment/:id`     | Admin                                                                           |

`:segment` vaut `cpus`, `gpus`, `laptops` ou `telephones` ; toute autre valeur donne un 404. Le slug `marche` est de fait réservé.

**Sécurité** : JWT HS256 de 24 h (en-tête `Authorization: Bearer`), clés commençant par `$` ou contenant `.` retirées des corps JSON, corps limité à 100 ko, limiteurs de débit en mémoire (instance unique), `trust proxy` à 1 pour Render. CORS : origines de production codées en dur dans `origines.js`, origines supplémentaires dans `CORS_ORIGINS`, **aucun motif sur `*.vercel.app`** (domaine partagé, voir le commentaire du fichier).

---

## 9. Cible : règles décidées, pas encore implémentées

Issues de l'étude stratégique. Ne pas les présenter comme existantes.

1. **Notes par profil d'usage** (Jeu, Création, Efficacité, Mobilité, Longévité) ; la note globale devient un résumé secondaire.
2. **Zone d'égalité** : sous 3 % d'écart, « équivalent » partout (`winnerIndex`, badge de tête), comme le font déjà `buildKeyDifferences` et `buildStrengths`.
3. **Pas de gagnant sur les specs papier** : fréquences, cœurs et threads s'affichent sans être surlignés.
4. **Normalisation contre une référence versionnée** au lieu de plafonds fixes qui saturent ; barème numéroté affiché sur chaque note.
5. **Moyenne géométrique pondérée** pour combiner plusieurs tests.
6. **Tests de cohérence** : dominance, direction de chaque critère, version du barème.
7. **Verdict IA contraint** : gagnant calculé par des règles, l'IA ne fait que rédiger, chiffres vérifiés, cache par paire.
8. **Provenance enrichie** : origine de la donnée (constructeur, laboratoire, agrégat), protocole exact du test, archive de la page source. Format décidé le 30 octobre 2026 : voir [`PROPOSITION-MESURE.md`](PROPOSITION-MESURE.md).

---

## 10. État des données et limites connues

> ⚠ **Catalogue de test.** Les fiches actuellement en production servent à faire tourner le site pendant le développement. Elles ne constituent pas un catalogue de référence, et leurs valeurs n'ont pas été revérifiées. Ne pas s'en servir pour calibrer des plafonds, des seuils ou des tests. **Avant toute mise en avant publique du site**, les remplacer par des données importées et vérifiées avec `scripts/import.js --verifier`.

**Base de production** (lue via l'API publique le 30 octobre 2026) : toutes les fiches portent un champ de provenance, aucune fiche générée par `populateRemaining.js` n'est présente.

| Collection | Fiches | Mesures présentes                                                      |
| ---------- | ------ | ---------------------------------------------------------------------- |
| CPU        | 15     | Cœurs, threads, fréquences, Geekbench 6 mono et multi (pas de `tdp_w`) |
| GPU        | 15     | Unités de calcul, VRAM, 3DMark                                         |
| Laptops    | 8      | Geekbench multi, autonomie Wi-Fi mesurée, luminosité (6 sur 8)         |
| Téléphones | 15     | Geekbench, AnTuTu (13 sur 15), batterie, écran                         |

**Fichiers de `backend/data/`** :

| Fichier              | Fiches | Mesures                                   | Source        |
| -------------------- | ------ | ----------------------------------------- | ------------- |
| `cpus.json`          | 20     | 2 nombres de cœurs, aucun benchmark       | NanoReview    |
| `gpus.json`          | —      | **fichier absent**                        | —             |
| `laptops.json`       | 8      | Identique à la production                 | Notebookcheck |
| `telephones.json`    | 15     | Identique à la production                 | NanoReview    |
| `demonstration.json` | 3      | Exemple de format (URL `exemple.invalid`) | —             |

Les 15 CPU et 15 GPU de la production n'existent dans aucun fichier du dépôt. Sans conséquence tant qu'il s'agit de données de test.

**Limites connues** :

- `scripts/populateRemaining.js` génère des laptops et téléphones **fictifs** et vide d'abord ces deux collections. Il refuse de tourner sans l'option `--donnees-fictives` **et** sans une base dont le nom contient `demo`, `test` ou `local`.
- La RTX 4090 (36 309 points 3DMark) dépasse le plafond GPU de 35 000 : elle est bloquée à 100/100, et toute carte plus rapide serait déclarée à égalité.
- Plafonds fixes : deux produits au-dessus du plafond obtiennent tous deux 100.
- Le frontend et l'API lisent `shared/`, situé hors de leur dossier : ne pas remettre de Root Directory sur Render (voir section 2).
- La note GPU ne précise pas quel test 3DMark est utilisé.
- L'API exige **Node ≥ 20.19** (chargement de `shared/`, en ESM, depuis du CommonJS).
- Les contrôles `--verifier` (page source téléchargée) et de quarantaine ne s'appliquent qu'à l'import, pas aux écritures de l'admin.

---

## 11. Règles de contribution

1. **Pas de nouvelle dépendance** sans raison forte. Interdits : frameworks CSS (Tailwind, Bootstrap, MUI) et bibliothèques de graphiques (Chart.js, Recharts). `lucide-react` est déjà installé : l'utiliser plutôt qu'ajouter une autre bibliothèque d'icônes.
2. **Une règle, un endroit** (voir 7.0). Aucune liste de champs en dur dans un composant. Un nouveau champ chiffré s'ajoute **au modèle Mongoose et à `shared/criteres.js`**, puis reçoit son intitulé dans `specs.js` ; les tests de cohérence signalent tout oubli.
3. **Aucune donnée inventée.** Une mesure absente reste absente et s'affiche « non noté » ou « — ». Jamais de valeur par défaut, jamais de `Math.random()`. Toute donnée entre avec sa provenance, par `scripts/import.js` (en lot) ou par l'admin ; les deux passent par `valideProduit`.
4. **Couleurs** : uniquement des variables `--ct-*`, redéfinies sous `[data-theme='dark']`. La couleur est réservée à la donnée (notes, cellules gagnantes, avantages) : voir `docs/DESIGN.md`.
5. **Tests** : toute modification de la logique de note, de départage, de données ou d'authentification s'accompagne d'un test `node --test` dans `backend/test/` ou `frontend/test/`. Les tests restent purs : ni base, ni réseau.
6. **Plafonds et formules** : uniquement dans `shared/criteres.js` et `shared/formules.js`. `shared/` reste sans dépendance, sans accès réseau et sans `await` au premier niveau (sinon le backend ne peut plus le charger par `require`).
7. **Ordre des routes** : les routes fixes (`/marche`, `/compare`) restent déclarées avant `/:id`.
8. **Sobriété** : pas d'animation décorative, de dégradé ni de halo.
9. **Ce document** : toute modification qui le rend inexact doit le mettre à jour dans le même commit.
