# Frontend — CompareTech

Interface web de la plateforme CompareTech développée avec React 19 et Vite.

## Architecture technique

- **Framework** : React 19, React Router 7
- **Style** : CSS natif modulaire (`src/index.css`) sans framework lourd (Bootstrap supprimé)
- **Graphiques** : Tracé radar SVG natif (`src/components/TechRadar.jsx`) sans bibliothèque externe
- **Tests** : 60 tests unitaires exécutés via `node --test`

## Installation et commandes

```bash
# Installation des dépendances
npm install

# Lancer en développement (port 5173 par défaut)
npm run dev

# Compiler pour la production
npm run build

# Exécuter les tests unitaires
npm test

# Vérifier le code avec ESLint
npm run lint
```

## Structure clé

- `src/utils/scores.js` — Moteur de calcul des notes et médianes
- `src/utils/specs.js` — Définition des caractéristiques et différences clés
- `src/utils/radarAxes.js` — Normalisation des axes du radar SVG
- `src/components/` — Composants d'interface (tableaux, fiches produits, filtres, sélecteur)
- `src/pages/` — Pages de routage (Accueil, Fiche produit, Comparateur, Admin)
