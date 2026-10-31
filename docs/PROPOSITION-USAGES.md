# Proposition : les notes par usage

> **Statut : décidé et implémenté le 31 octobre 2026** (`shared/usages.js`) : six profils, barème v1, affichés sur la fiche produit et dans le comparatif. Les FPS des GPU ont été relevés (section 4) ; restent la Création GPU et l'Autonomie des téléphones.

---

## 1. Le problème

Aujourd'hui, chaque produit a **une note sur 100**, calculée sur un ou deux benchmarks (`shared/formules.js`). Elle répond mal à la question du visiteur, qui n'est pas « lequel est le meilleur ? », mais « lequel est le meilleur **pour ce que je veux en faire** ? ». Un Ryzen 7 9800X3D et un Ryzen 9 9950X ne gagnent pas aux mêmes endroits ; une note unique cache exactement ce qui les départage.

L'étude de cas recommande donc des **notes par usage**, la note globale devenant un résumé secondaire.

## 2. Le principe qui décide de tout

**Un profil n'est noté que s'il repose sur des mesures.** Jamais sur des specs papier (cœurs, GHz, mAh, TDP), jamais sur une valeur par défaut. Quand la mesure manque, le profil n'est pas affiché, ou il est affiché « non noté », et le site dit pourquoi.

C'est la ligne qui sépare CompareTech des comparateurs que l'étude critique : ceux-ci notent « Jeu » à partir de la fréquence turbo. La fiche produit actuelle le fait encore dans ses textes (`ficheProduit.js`) ; ces textes seraient remplacés par les profils.

## 3. Ce que les données réelles permettent aujourd'hui

| Catégorie | Profil                                   | Mesures disponibles                         | Possible ?                                         |
| --------- | ---------------------------------------- | ------------------------------------------- | -------------------------------------------------- |
| CPU       | **Création** (rendu, calcul)             | Cinebench 2024 multi, Geekbench 6 multi     | ✅                                                 |
| CPU       | **Réactivité** (bureautique, navigation) | Geekbench 6 mono                            | ✅                                                 |
| CPU       | Jeu                                      | aucune mesure en jeu                        | ❌ (Geekbench mono n'en est qu'un indice lointain) |
| CPU       | Longévité                                | socket, année de sortie                     | ➖ une **information**, pas une note               |
| GPU       | Jeu                                      | Time Spy (test exact inconnu)               | 🟡 possible, mieux avec les FPS (section 4)        |
| GPU       | Création                                 | aucune                                      | ❌ sans nouvelle mesure                            |
| Portable  | **Mobilité**                             | autonomie Wi-Fi mesurée, luminosité mesurée | ✅                                                 |
| Portable  | **Performance**                          | Geekbench multi (laboratoire)               | ✅                                                 |
| Portable  | Jeu                                      | aucune                                      | ❌                                                 |
| Téléphone | **Performance**                          | Geekbench 6 mono et multi                   | ✅                                                 |
| Téléphone | Autonomie                                | capacité en mAh seulement                   | ❌ une capacité n'est pas une endurance            |
| Téléphone | Photo                                    | aucune                                      | ❌                                                 |

**Six profils sont faisables tout de suite**, sans nouvelle donnée.

## 4. Les mesures qui débloqueraient le reste

Repérées sur les sources que le vérificateur sait déjà lire. Chacune est un nouveau champ, à relever une fois par produit.

| Mesure                                | Source               | Débloque                   |
| ------------------------------------- | -------------------- | -------------------------- |
| FPS moyens 1080p, 1440p et 4K (GPU)   | NanoReview (vérifié) | Jeu (GPU), le plus attendu |
| Blender GPU ou Geekbench 6 OpenCL     | NanoReview (vérifié) | Création (GPU)             |
| Endurance en usage actif (téléphones) | GSMArena (à sonder)  | Autonomie (téléphone)      |

Les FPS sont la mesure la plus proche du « terrain » que demande l'étude : un visiteur comprend « 107 images par seconde en 4K » ; il ne comprend pas « 36 299 points Time Spy ».

## 5. Comment se calcule une note de profil

1. **Chaque mesure est ramenée à une référence** : sa valeur divisée par celle d'un **barème versionné** (par exemple « barème v1, octobre 2026 »), multipliée par 100. Le barème remplace les plafonds actuels : quand un produit le dépasse (la RTX 4090 sature déjà le plafond GPU), on publie un barème v2 au lieu de bloquer tout le monde à 100. La version du barème est affichée sous chaque note.
2. **Plusieurs mesures se combinent par moyenne géométrique pondérée**, pas par moyenne simple : un produit très fort sur un test ne peut pas masquer une faiblesse sur l'autre.
3. **Une mesure manquante rend le profil « non noté »**, jamais 0.
4. **La zone d'égalité à 3 % s'applique** aux notes de profil comme partout ailleurs.
5. **Les formules vivent dans `shared/`**, à côté des critères, et ont leurs tests : un profil qui citerait une spec papier, ou un poids total différent de 100 %, casse le test.

## 6. Décisions (31 octobre 2026)

| Question                      | Décision                                                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Q1.** FPS des GPU d'abord ? | **Oui** : relevés avant de construire les profils ; le profil Jeu (GPU) reposera sur les FPS.                                |
| **Q2.** Note globale ?        | **Gardée en résumé secondaire**, sous les profils.                                                                           |
| **Q3.** Profils sans mesure ? | **Non affichés** ; ils apparaîtront quand la mesure existera.                                                                |
| **Q4.** Barème versionné ?    | **Oui** : barème v1 calé sur le catalogue d'octobre 2026, version affichée sous chaque note, v2 quand un produit le dépasse. |
