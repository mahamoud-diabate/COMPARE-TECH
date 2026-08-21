# Rapport de refonte — CompareTech

Document de passation. Il consigne ce qui a été fait, **pourquoi**, ce qui reste
ouvert, et les pièges rencontrés — pour qu'une reprise n'ait pas à redécouvrir
les mêmes choses.

**Branche :** `refonte-interface` · **Rien n'a été poussé.**

L'historique a été refondu après coup : le travail décrit ici a d'abord vécu
sur une branche `refonte-nanoreview`, dont les commits ont ensuite été repris,
renommés (préfixe CSS `nr-` → `ct-`) et rassemblés dans `7070acb` puis
`ee774d9`. **Le contenu est intégralement présent dans `HEAD`** — c'est
vérifiable fichier par fichier — mais les identifiants de commit d'origine ne
correspondent plus à rien dans l'historique actuel.

---

## 1. Point de départ et objectif

Le site existait, fonctionnel, mais habillé d'un thème sombre à dégradés, halos
et police display. L'objectif énoncé : **ressembler à
les comparateurs denses du domaine**, qui font passer la donnée avant la décoration.

Les jetons de la référence ont été relevés au navigateur, pas approximés :
fond `#f5f5f5`, cartes blanches rayon 4 px, ombre `0 0 3px rgba(0,0,0,.08)`,
police système 14 px / interligne 1,7, tableaux 13 px à filets `#ebebeb`.

L'objectif s'est ensuite précisé : au-delà de la densité et de la sobriété, le
site devait porter **une identité propre** plutôt que décalquer une mise en page
existante — d'où les partis pris décrits en §2.5 et §2.6.

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
- **Navigation en tiroir.** Structure finale, après deux corrections :

  ```
     ⚖  Comparer deux produits      ← premier, en gras, sans intitulé
  —  CLASSEMENTS 🏆
     Processeurs · Cartes graphiques · Ordinateurs portables · Téléphones
  —  GESTION
     Administration
  ```

  Deux enseignements. **Le tiroir listait d'abord les quatre mêmes libellés et
  icônes dans « Comparer » et « Classements »** — huit liens pour quatre
  destinations, une lecture de doublon. Les quatre entrées « Comparer » ne
  faisaient que présélectionner un onglet que la page de comparaison porte déjà :
  elles ont été fondues en une seule.

  Ensuite, **l'ordre suivait la commodité de mise en page** (la liste de quatre
  d'abord) et non l'intention du produit. Le classement sert à trouver un
  produit, la comparaison est ce qu'on vient faire : elle passe donc en tête.
  Mise en avant par la graisse et l'espace, jamais par la couleur.
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

Les constantes de couleur ne sont plus empruntées, mais dérivées de la palette
du projet :

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

### 2.7 Icônes

Système à deux sources : un fichier déposé dans `frontend/src/assets/icons/`,
un tracé de repli sinon. **Deux techniques d'affichage selon le fichier :**

| Type de fichier | Rendu | Suit le thème |
| --- | --- | --- |
| PNG en couleur (`cpu`, `gpu`, `laptop`, `phone`) | `<img>` tel quel | **non** |
| PNG monochrome (`menu`, `ranking`, `compare`) | masque CSS `.nr-mask-icon` | **oui** |

Le masque n'utilise que le canal alpha : la forme vient du fichier, la couleur
du contexte. Il ne convient qu'aux fichiers sans couleur propre — un dessin
colorié y perdrait tout sauf sa silhouette.

Attribution obligatoire, affichée en pied de page et renseignée dans
`ATTRIBUTIONS` (`Footer.jsx`) : actuellement **bqlqn sur Flaticon** et
**Icons8**. Tant qu'un fichier est présent sans auteur déclaré, le pied de page
affiche un avertissement plutôt qu'une mention incomplète.

### 2.8 Robustesse

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
29 composants · 14 pages · 6 utils · 3 hooks
54 tests · lint propre · build OK
JS 392 Ko (124 Ko gzip) · CSS 35 Ko
8 fichiers dans assets/icons/
```

Tout est commité sur `refonte-interface`. Le préfixe des classes CSS est
`ct-*` depuis la refonte de `7070acb`.

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

### 5.4 Frictions « débutant » — traitées puis annulées

Trois constats formulés après relecture sous l'angle d'un visiteur qui découvre
le site. Ils ont été implémentés puis **annulés sur demande** juste après. Les constats
restent valides, mais **le code correspondant n'existe plus dans l'historique** :
il vivait dans un commit devenu orphelin lors de la refonte de branche, que le
nettoyage automatique de Git finira par supprimer. À considérer comme **à
refaire**, en s'appuyant sur les descriptions ci-dessous.

1. **Navigation masquée sur grand écran.** Ouvrir un tiroir pour découvrir les
   catégories ralentit la découverte sur un écran de bureau. Correction faite :
   les quatre classements dans l'en-tête au-delà de 900 px, le tiroir en dessous.

2. **Rival direct sur la fiche produit.** Le bloc « Comparer avec » existe, mais
   choisissait par proximité de score seule — donc trois AMD sur un AMD. Or
   l'acheteur se demande « AMD ou Intel ? ». Correction faite : `pickRivals`
   réservait la première place au concurrent le plus proche d'une **autre
   marque**, avec quatre tests.

3. **Vulgarisation des benchmarks.** « Geekbench 6 (mono-cœur) » ne parle pas à
   tout le monde. Correction faite : `MESURE_EXPLIQUEE` traduisait sept mesures
   en français courant, **en texte visible** — et non en infobulle au survol, qui
   n'existe ni au doigt ni au clavier et cacherait l'explication à ceux qui en
   ont le plus besoin.

### 5.5 Ordre suggéré

1. **Les vraies données** (§5.1). Rien d'autre ne compte tant que ce n'est pas
   fait — tout le reste est du vernis sur un catalogue inventé.
2. **Reprendre les trois frictions** (§5.4) : les constats restent valides, mais
   le code est à réécrire — voir la mise en garde de cette section.
3. **Des tests de composant** (§5.3) sur les interactions vérifiées à la main
   une seule fois.
4. **Supprimer les styles en ligne** (§5.2), ou assumer le mélange et l'écrire
   dans `DESIGN.md`.

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
- Pour ajouter une icône de catégorie : déposer le fichier dans
  `frontend/src/assets/icons/` sous le nom `cpu`, `gpu`, `laptop`, `phone` ou
  `admin`. Voir le LISEZ-MOI du dossier.
- **Vérifier d'abord si le fichier est monochrome.** Si oui, l'afficher par
  masque CSS (`.nr-mask-icon`) plutôt qu'en `<img>` : il suivra alors le thème.
  C'est ce que font `menu`, `ranking` et `compare`.
- **L'attribution est obligatoire** et se renseigne dans `ATTRIBUTIONS`
  (`Footer.jsx`). Quand la banque signe de son propre nom, ne pas répéter
  (« Icons8 sur Icons8 ») — le composant s'en charge.

---

## 7. Documents liés

- [`DESIGN.md`](DESIGN.md) — la charte : règle de couleur, formes, typographie,
  accessibilité non négociable, états obligatoires, et le piège du bloc
  conteneur.
- [`README.md`](README.md) — section « Interface » : les trois fichiers qui
  concentrent la connaissance métier.
- `frontend/src/assets/icons/LISEZ-MOI.md` — procédure d'ajout d'icône.
