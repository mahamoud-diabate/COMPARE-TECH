# Rapport de refonte — CompareTech

Document de passation. Il consigne ce qui a été fait, **pourquoi**, ce qui reste
ouvert, et les pièges rencontrés — pour qu'une reprise n'ait pas à redécouvrir
les mêmes choses.

**Branche :** `refonte-nanoreview` · **Point de restauration :** commit `61f279f`
· **Rien n'a été poussé.**

---

## 1. Point de départ et objectif

Le site existait, fonctionnel, mais habillé d'un thème sombre à dégradés, halos
et police display. L'objectif énoncé : **ressembler à
[nanoreview.net](https://nanoreview.net)**, la référence du domaine.

Les jetons de la référence ont été relevés au navigateur, pas approximés :
fond `#f5f5f5`, cartes blanches rayon 4 px, ombre `0 0 3px rgba(0,0,0,.08)`,
police système 14 px / interligne 1,7, tableaux 13 px à filets `#ebebeb`.

L'objectif a ensuite évolué en trois temps :

1. ressembler à la référence ;
2. **ne ressembler à aucun site « vibe codé »** (grille d'audit fournie) ;
3. **s'écarter de la référence**, jugée trop plagiée, par une originalité propre.

---

## 2. Ce qui a été fait

### 2.1 Design system

`frontend/src/index.css` est désormais **la seule feuille de style du site**
(1 523 lignes, système de classes `.nr-*`). Bootstrap a été retiré : il ne
servait plus qu'à trois utilitaires de mise en page pour 250 Ko de CSS.

La règle qui commande tout le reste, consignée dans [`DESIGN.md`](DESIGN.md) :

> **La couleur est réservée à la donnée.**
> Le châssis est graphite `#2b333c`. La couleur n'apparaît que là où elle encode
> une mesure : échelle de notes, cellule gagnante, avantage/inconvénient.

### 2.2 Dépendances : 12 → 5

Retirés : `bootstrap`, `react-bootstrap`, `react-router-bootstrap`, `chart.js`,
`react-chartjs-2`, `recharts`, `framer-motion`.

Restants : `react`, `react-dom`, `react-router-dom`, `react-hot-toast`,
`lucide-react`.

| | Avant | Après |
| --- | --- | --- |
| CSS | 247 Ko | **34 Ko** |
| JS servi | 809 Ko | **381 Ko** |

Le radar a été **réécrit en SVG à la main** (recharts pesait 319 Ko pour ce seul
écran) et accepte N séries au lieu de 2.

### 2.3 Déduplication

Les quatre pages catégorie et les quatre fiches produit étaient **la même page
copiée quatre fois**. Elles passent par `CategoryPage` et `ProductDetail`, seuls
les jeux d'options restant propres à chaque catégorie.

`utils/specs.js` devient la **source unique** des caractéristiques affichables,
alignée sur les modèles Mongo. Le formulaire d'administration en est dérivé.

### 2.4 Pages ajoutées ou refondues

- **`/compare` sans produits** était une impasse. C'est désormais une **page de
  sélection** : deux champs à complétion, « VS », et 24 confrontations serrées
  calculées depuis le classement.
- **Navigation en tiroir**, séparant « Comparer » et « Classements » — deux
  choses distinctes que la barre plate présentait à l'identique.
- **Titre et description par page**, dérivés des données.

### 2.5 Originalité — « CompareTech montre son calcul »

Quatre chantiers exprimant une seule idée : *un comparateur qui affiche 88/100
sans montrer d'où ça vient demande qu'on lui fasse confiance.*

1. **Le calcul déplié.** Les formules sont décrites **en données**
   (`FORMULES` dans `scores.js`), pas écrites en code. Le total et son
   explication sortent de la même table, ils ne peuvent donc pas diverger — un
   test le verrouille.

   ```
   Geekbench 6 multi-cœur   24 500 / 29 000  × 70 %   59
   Geekbench 6 mono-cœur     3 400 /  3 500  × 30 %   29
   ─────────────────────────────────────────────────────
   Total                                              88
   ```

2. **Le rang et la médiane** (`rankInCategory`), avec une réglette graduée.
   Un 88 isolé ne dit rien ; sa distance à la médiane dit tout.

3. **La complétude assumée** (`dataCompleteness`). Sur un modèle incomplet, la
   fiche dit franchement « 4 caractéristiques renseignées sur 7 — manque : … »
   et explique pourquoi la note est absente.

4. **Signature « instrument »** : filets gradués aux quarts, chiffres en chasse
   fixe, réglette de distribution.

### 2.6 Écart avec la référence

Toutes les constantes relevées à la pipette ont été remplacées :

| | Avant (repris) | Après (dérivé) |
| --- | --- | --- |
| Échelle de notes | `#028612`, `#467546`, `#6c0180`… | `#1a7f37`, `#4d7c2a`, `#8a6a10`, `#b45309`, `#b42318` |
| Cellule gagnante | `#eaf9e3` | `#e4f0e7` (vert A+ à 12 %) |
| Accent | `#3949ab` (indigo) | `#2b333c` (graphite) |

L'échelle de la référence était **incohérente** (vert → vert → **violet** →
orange → rouge). La nouvelle est monotone, et ses **dix contrastes ont été
calculés** : tous ≥ 4,5:1 (AA) dans les deux thèmes. Les cinq valeurs claires
sont resserrées entre 4,96 et 6,57:1, pour que l'échelle se lise par la teinte
et non par un écart de luminosité.

**La couleur n'est jamais seule** : la note-lettre l'accompagne partout.

### 2.7 Robustesse

- **54 tests** (`node --test`, sans dépendance) sur `specs.js`, `scores.js`,
  `radarAxes.js`.
- **Anneau de focus** `:focus-visible` sur tout élément atteignable au clavier.
  Plus aucun `outline: none` dans le CSS.
- **`RouteError`** : une exception de rendu ne produit plus de page blanche
  (testé en cassant volontairement un composant).
- **Verrou de soumission** côté administration.
- **Proxy de développement** vers l'API — son CORS refuse `localhost`.
- Sémantique réelle : `<th scope="row">`, `role="combobox"` complet, tiroir
  `inert` quand fermé.

---

## 3. Bugs trouvés et corrigés

Les causes racines valent d'être conservées.

| Bug | Cause |
| --- | --- |
| Barre de comparaison à 8 500 px du haut | Un ancêtre avec `transform` devient le **bloc conteneur** des descendants `position: fixed` |
| Barre de noms qui ne collait pas | `.nr-card` porte `overflow: hidden`, ce qui **annule `position: sticky`** |
| Barre d'ancres qui disparaissait | Même cause |
| Un comparatif à égalité annonçait un gagnant | `indexOf(Math.max(...))` renvoie le premier |
| Un comparatif à 3 produits en ignorait un | `KeyDifferences` et le radar ne traitaient que 2 |
| Flash de thème au premier rendu | `index.html` forçait le sombre, `App.jsx` le clair |
| Tiroir fermé atteignable au clavier | React 19 ignore `inert=""` — il faut un **booléen** |
| Icônes du menu absentes à l'ouverture | `loading="lazy"` repose sur l'intersection ; un tiroir hors écran ne se charge jamais |
| 403 sur l'API en local | Le CORS de Render exclut `localhost` quand `NODE_ENV=production` |

---

## 4. État actuel

```
28 composants · 14 pages · 5 utils · 3 hooks
4 843 lignes JS/JSX · 1 523 lignes CSS
54 tests · lint propre · build OK
JS 381 Ko (123 Ko gzip) · CSS 34 Ko
```

**Commité** (`61f279f`) : toute la refonte jusqu'aux tests et à
l'accessibilité.

**Non commité** — les quatre chantiers d'originalité, l'échelle de notes
dérivée, le tiroir, la page de sélection, les icônes :

- `frontend/src/components/ScorePanel.jsx`
- `frontend/src/components/icons.jsx`
- `frontend/src/utils/iconFiles.js`
- `frontend/src/assets/icons/` (cpu, gpu, laptop, phone, menu — PNG Flaticon)
- `frontend/src/components/ThemeToggle.{jsx,css}` *(ajouté hors de mes
  modifications)*
- plus 17 fichiers modifiés

---

## 5. Ce qui reste ouvert

### 5.1 Les données — bloquant

**C'est le problème dominant.** Le commentaire de
`backend/scripts/populateRemaining.js` le dit lui-même : *« ces produits sont
générés, pas scrapés »*. Le catalogue contient des « Sony Phone Pro 21 », et
**119 processeurs sur 136 n'ont pas de note** faute de `geekbench_single`.

| Collection | Total | Avec le benchmark clé |
| --- | --- | --- |
| CPU | 136 | **17** |
| GPU | 104 | 104 |
| Portables | 100 | 100 |
| Téléphones | 100 | 100 |

`backend/scripts/purge.js` a été écrit pour vider les collections
(`npm run purge`, sauvegarde JSON automatique, `--yes` obligatoire, ne touche
jamais `users`). **Il n'a jamais été exécuté.**

À trancher : compléter le mono-cœur, ou noter les CPU sur le multi seul.

### 5.2 Dette technique

1. **Zéro test de composant** — 54 tests couvrent 3 modules sur 8 et 0 composant
   sur 28.
2. **144 `style={{ }}` en ligne** (23 dans `AdminPage`) : un système CSS
   discipliné contourné 144 fois.
3. **`AdminPage`, 376 lignes** — rhabillé, pas repensé.
4. **Aucune pagination** — 136 lignes rendues d'un coup.
5. **`phone.png` pèse 98 Ko** — quelques centaines d'octets en SVG.

### 5.3 Non vérifié

Trois comportements reposent sur du raisonnement, faute d'un volet navigateur
qui compose des frames :

- le suivi de section au défilement (`IntersectionObserver`) — la *logique de
  sélection* a été testée en pilotant le rappel à la main, pas le déclenchement ;
- la réserve de hauteur au redimensionnement (`ResizeObserver`) — mesure
  initiale vérifiée, mise à jour non ;
- le parcours réel à la touche `Tab` — la règle CSS est vérifiée dans la
  feuille compilée.

### 5.4 Ordre suggéré

1. **Les vraies données.** Rien d'autre ne compte tant que ce n'est pas fait.
2. **Des tests de composant** sur les quatre interactions ci-dessus.
3. **Supprimer les styles en ligne**, ou assumer le mélange et l'écrire dans
   `DESIGN.md`.

---

## 6. Pratique

```bash
npm --prefix frontend run dev     # http://localhost:5173
npm --prefix frontend test        # 54 tests
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix backend test         # 10 tests
```

**Pièges à connaître**

- Le front passe par un **proxy Vite** vers l'API Render, car son CORS refuse
  `localhost`. En production, l'URL absolue est utilisée — vérifié dans le
  bundle.
- Redémarrer le serveur de dev après tout changement de dépendances ou de
  `.env` : Vite garde les valeurs chargées au démarrage.
- Pour ajouter une icône : déposer le fichier dans
  `frontend/src/assets/icons/` sous le nom `cpu`, `gpu`, `laptop`, `phone` ou
  `admin`. Voir le LISEZ-MOI du dossier. **L'attribution Flaticon est
  obligatoire** et se renseigne dans `ATTRIBUTIONS`, dans `Footer.jsx`.

---

## 7. Documents liés

- [`DESIGN.md`](DESIGN.md) — la charte : règle de couleur, formes, typographie,
  accessibilité non négociable, états obligatoires, et le piège du bloc
  conteneur.
- [`README.md`](README.md) — section « Interface » : les trois fichiers qui
  concentrent la connaissance métier.
- `frontend/src/assets/icons/LISEZ-MOI.md` — procédure d'ajout d'icône.
