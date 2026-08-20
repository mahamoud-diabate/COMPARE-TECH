# Charte d'interface — CompareTech

Ce document fixe les règles que suit `frontend/src/index.css`. Il existe pour
qu'une décision prise une fois n'ait pas à être rediscutée à chaque écran, et
pour qu'un écart se voie en relecture.

## 1. La couleur est réservée à la donnée

C'est la règle qui commande toutes les autres.

L'interface — navigation, cartes, filets, boutons, liens, onglet actif — est
**achromatique** : `--nr-accent` est un graphite `#2b333c`. La couleur
n'apparaît que là où elle **encode une mesure** :

| Couleur | Ce qu'elle signifie |
| --- | --- |
| Échelle `--nr-g-*` (vert → ambre → rouge) | note du produit, A+ à D |
| `--nr-win` (vert pâle) | valeur la plus favorable d'une ligne de tableau |
| `--nr-plus` / `--nr-minus` | avantage / inconvénient |
| `--nr-serie-*` | identité d'un produit sur le radar — **pas** une qualité |

L'échelle de notes est **monotone** : chaque palier se déduit du précédent par
une rotation de teinte, sans rupture. Les cinq contrastes sur fond blanc sont
volontairement voisins (4,96 à 6,57:1, tous AA) — l'échelle se lit par la
teinte, aucun palier ne paraît plus fort par un simple écart de luminosité.

**La couleur n'est jamais le seul porteur** : la note-lettre l'accompagne
partout, ce qui rend l'échelle lisible sans distinguer le vert du rouge. Les
couleurs de série du radar sont tenues hors de cette échelle, pour qu'un
polygone vert ne se lise pas « bon ».

Conséquence recherchée : sur une page de comparatif, les seules taches de
couleur sont les notes et les cellules gagnantes. C'est exactement ce qu'on
vient y lire.

**Interdits :** dégradé sur du texte (`background-clip: text`), halo coloré,
palette indigo/violet « moderne » par défaut.

### Une exception, assumée

Les icônes de catégorie déposées dans `src/assets/icons/` sont affichées telles
quelles, couleurs comprises. Elles sont choisies pour leur apparence, pas
générées à partir d'une mesure — la règle ci-dessus ne s'y applique donc pas.

Deux conséquences à garder en tête :

1. **Elles ne suivent pas le thème.** Un dessin clair restera clair sur fond
   sombre. Vérifier chaque fichier dans les deux thèmes avant de l'adopter.
2. **Ce sont des images**, pas des tracés : leur netteté dépend de la
   résolution du fichier, et chacune ajoute une requête au chargement. Préférer
   le SVG au PNG quand le site le propose.

Les tracés de repli de `components/icons.jsx`, eux, restent sur `currentColor`
et suivent le thème.

## 2. Aucune couleur en dur dans une règle de composant

Toute couleur passe par une variable `--nr-*`, redéfinie sous
`[data-theme="dark"]`. Une valeur écrite en dur casse le thème sombre sans
prévenir.

## 3. Formes et relief

- **Rayon : 3 px.** 4 px pour les cartes. Rien au-delà.
- **Relief : une ombre d'un pixel** (`0 0 3px rgba(0,0,0,.08)`), pas de bordure
  grise autour de chaque bloc. La séparation se fait par le fond et l'espace.
- Pas de `backdrop-filter` décoratif. La seule occurrence est fonctionnelle :
  la barre de noms collante doit laisser deviner le contenu qui passe dessous.

## 4. Typographie

Pile système, 14 px, interligne 1,7. Échelle courte et fixe :

| Classe | Taille | Usage |
| --- | --- | --- |
| `.nr-title-h1` | 25 px | titre de page |
| `.nr-title-h2` | 21 px | titre de section |
| `.nr-title-h3` | 18 px | groupe dans un tableau |
| `.nr-title-h4` | 16 px | intitulé d'un bloc de mesure |

Pas de `clamp()`, pas de police display, pas de mot en italique serif au milieu
d'un titre.

## 5. Accessibilité — non négociable

- **Tout élément atteignable au clavier porte un anneau de focus visible.**
  Il est posé une seule fois, sur `:focus-visible`, dans la section « FOCUS
  CLAVIER » de `index.css`. **Ne jamais écrire `outline: none`** sans anneau de
  remplacement.
- Balises réelles : `<button>` pour une action, `<a href>` pour une
  destination. Jamais de `<div onClick>`.
- Les intitulés de ligne d'un tableau sont des `<th scope="row">`.
- Un champ à complétion est un `role="combobox"` complet : `aria-expanded`,
  `aria-controls`, `aria-activedescendant`, navigation ↑/↓/Entrée/Échap.
- Les animations sont neutralisées sous `prefers-reduced-motion`.

## 6. États obligatoires

Un écran qui charge des données déclare les quatre :

1. **chargement** — squelette de la même forme que le contenu final, pour
   éviter le saut de mise en page ;
2. **vide** — ce qu'il faut faire pour qu'il ne le soit plus ;
3. **erreur** — cause probable et bouton de reprise ;
4. **plein**.

Toute action d'écriture verrouille son bouton jusqu'à la réponse du serveur.
Une exception de rendu est rattrapée par `RouteError` : jamais de page blanche.

## 7. Le piège à connaître

Un ancêtre portant `transform`, `filter`, `perspective`, `will-change` ou
`contain: paint` devient le **bloc conteneur** de ses descendants
`position: fixed` — qui se positionnent alors par rapport à lui, pas par
rapport à la fenêtre. C'est ce qui envoyait la barre de comparaison à 8 500 px
du haut. L'animation d'entrée n'utilise donc que l'opacité.

## 8. Écriture

Décrire ce que fait le produit, avec les chiffres réels.

| À bannir | À écrire |
| --- | --- |
| « Comparez en toute simplicité » | « Note sur 100 par critère, calculée depuis les caractéristiques mesurées » |
| « Performances de pointe » | « Geekbench 6 · 70 % multi, 30 % mono » |

Et ne jamais affirmer plus que ce que la donnée permet : à égalité de score, le
site écrit « obtiennent la même note », pas « le meilleur est ».
