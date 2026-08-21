# Feuille de Route & Recommandations d'Amélioration — CompareTech

Ce document synthétise l'ensemble des axes d'amélioration techniques, architecturaux et UX identifiés pour faire de **CompareTech** une plateforme de référence pérenne, maintenable et performante.

---

## 1. Données & Schémas (Priorité Absolue)

### 1.1 Assainissement du catalogue existant
- **Constat** : 119 processeurs sur 136 ne disposent pas de score `geekbench_single` (donc pas de note globale), et une partie des modèles a été synthétisée plutôt que scrapée.
- **Actions** :
  1. Compléter ou rescraper les scores `geekbench_single` manquants pour les CPU.
  2. Remplacer les données générées par des fiches réelles issues de benchmarks publics validés.
  3. Implémenter un filtre statistique d'exclusion des valeurs aberrantes (*outliers* liés aux modes économie d'énergie ou overclocks instables).

### 1.2 Typage strict des schémas (Backend)
- **Constat** : Des métriques physiques sont stockées en `String` (ex. `max_freq_ghz: "5.7"`, `display_size: "6.8 pouces"`), forçant le frontend à utiliser des expressions régulières pour calculer les graphiques.
- **Actions** :
  1. Convertir tous les champs mesurables en `Number` standardisé dans les modèles Mongoose (`Cpu.js`, `Gpu.js`, `Laptop.js`, `Telephone.js`).
  2. Valider les plages de valeurs à l'écriture (via Zod ou validateurs Mongoose).

---

## 2. Architecture Backend & Base de Données

### 2.1 Indexation Mongoose
- **Constat** : Absence d'index sur les champs de tri et de recherche (*COLLSCAN* systématique).
- **Actions** :
  1. Ajouter des index simples sur les scores (`{ geekbench_multi: -1 }`, `{ benchmark_3dmark: -1 }`, `{ antutu_score: -1 }`).
  2. Ajouter un index textuel composé `{ name: 'text', brand: 'text' }` pour accélérer la recherche globale.

### 2.2 URLs résilientes et SEO (Slugs)
- **Constat** : Les fiches utilisent l'identifiant MongoDB brut (`/cpus/64b1f...`). Tout réimport casse les URLs et le référencement.
- **Actions** :
  1. Ajouter un champ `slug` unique et indexé (ex: `amd-ryzen-7-7800x3d`).
  2. Rendre les routes d'API et les pages frontend compatibles `/cpus/:slug`.

### 2.3 Pagination et projection
- **Constat** : `GET /api/:segment` charge toute la collection sans limite.
- **Actions** :
  1. Ajouter les paramètres `?page=1&limit=24&sort=score_desc`.
  2. Limiter la projection des champs sur les listes (exclure les détails lourds pour n'envoyer que l'essentiel des cartes).

---

## 3. Performance & Infrastructure

### 3.1 Edge Caching HTTP (Absorption du cold start)
- **Constat** : L'API hébergée sur le palier gratuit Render s'endort et impose 20 à 50 s d'attente au premier visiteur.
- **Actions** :
  1. Configurer des en-têtes HTTP `Cache-Control: public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400` sur toutes les routes `GET /api/*`.
  2. Placer le domaine derrière Cloudflare (Plan gratuit) : plus de 85 % des requêtes de consultation seront servies depuis les nœuds Edge en < 30 ms sans réveiller le backend.

### 3.2 Cache client
- **Constat** : La navigation entre pages relance des requêtes réseau redondantes.
- **Actions** :
  1. Généraliser la mise en cache côté client avec un TTL de 10 à 30 min (SWR / TanStack Query ou cache catalog étendu).

---

## 4. Expérience Utilisateur (UX) & Frictions

### 4.1 Navigation adaptative Grand Écran vs Mobile
- **Constat** : Devoir ouvrir le tiroir latéral pour accéder aux catégories sur un écran PC large ralentit l'exploration.
- **Actions** :
  1. Afficher les 4 liens de classements directement dans le bandeau supérieur au-delà de 900 px de largeur d'écran.
  2. Conserver le bouton et le menu tiroir pour les tablettes et mobiles.

### 4.2 Confrontations pertinentes (« Rival direct »)
- **Constat** : Le bloc de suggestions sur une fiche produit compare souvent des références de la même marque (ex: AMD vs AMD).
- **Actions** :
  1. Prioriser automatiquement dans les suggestions le concurrent le plus proche en score d'une **autre marque** (ex: *Ryzen 7 7800X3D* $\rightarrow$ *Core i7-14700K*).

### 4.3 Vulgarisation des métriques
- **Constat** : Les noms de benchmarks bruts (*Geekbench Single-Core*, *3DMark*, *AnTuTu*) manquent de clarté pour les utilisateurs débutants.
- **Actions** :
  1. Associer à chaque métrique une explication courte en texte clair (ex: *Mono-cœur = Réactivité quotidienne et jeux* ; *Multi-cœur = Rendu 3D et montage vidéo*).

---

## 5. Algorithme de Scoring & Modélisation Mathématique

### 5.1 Normalisation non-linéaire (Logarithmique)
- **Constat** : Une échelle purement linéaire tend à tasser les produits d'entrée et de milieu de gamme.
- **Actions** :
  1. Appliquer une fonction logarithmique $S_{\text{log}}(x)$ pour étirer la distribution des scores intermédiaires tout en préservant le sommet du classement.

### 5.2 Pondération multicritère explicite
- **Modèle cible** :
  - **CPU** : $40\%$ Single-Core + $60\%$ Multi-Core.
  - **GPU** : $70\%$ Puissance 3D brute + $30\%$ Capacité VRAM.
  - **Laptop** : $50\%$ CPU/GPU + $30\%$ Autonomie/Écran + $20\%$ RAM/Stockage.
  - **Téléphone** : $40\%$ SoC + $35\%$ Écran/Batterie + $25\%$ Mémoire/Stockage.

---

## Synthèse de la Priorisation

| Ordre | Chantier | Impact | Effort |
| :--- | :--- | :--- | :--- |
| **P1** | Fiabilisation des données & `geekbench_single` | Critique | Moyen |
| **P2** | Edge Caching Cloudflare & en-têtes HTTP | Élevé (vitesse instantanée) | Faible |
| **P3** | Typage des schémas & Indexation Mongo | Élevé (robustesse) | Faible |
| **P4** | Frictions UX (Rival direct, navigation desktop) | Élevé (engagement) | Faible |
| **P5** | Slugs d'URLs & Pagination API | Moyen (SEO & Scalabilité) | Moyen |
