# Icônes personnalisées

Dépose ici les fichiers `.svg` téléchargés. Ils remplacent automatiquement
l'icône correspondante dans toute l'interface — aucun code à modifier.

## Noms de fichiers attendus

| Fichier | Remplace |
| --- | --- |
| `cpu.svg` | Processeurs |
| `gpu.svg` | Cartes graphiques |
| `laptop.svg` | Ordinateurs portables |
| `phone.svg` | Téléphones |
| `admin.svg` | Administration |

Un fichier absent laisse simplement l'icône actuelle en place : tu peux donc
n'en remplacer qu'une, ou les cinq, dans l'ordre que tu veux.

## Format

**SVG uniquement.** Sur Flaticon, choisir « SVG » et non PNG : un PNG est figé
en taille et en couleur, il rendra flou et restera noir en thème sombre.

Les couleurs du fichier sont neutralisées à l'affichage et remplacées par
`currentColor` : l'icône prend la couleur de son contexte et suit donc le thème
clair comme sombre, sans qu'il faille deux versions.

## Attribution — obligatoire

La licence gratuite de Flaticon **exige une mention visible** dans le produit.
Elle est affichée dans le pied de page dès qu'au moins un fichier est présent
ici, via `frontend/src/components/Footer.jsx`.

Renseigne le nom de l'auteur de chaque icône dans `ATTRIBUTIONS` (même
fichier) : la page de téléchargement l'indique, sous la forme
« Icon by *auteur* ». Sans cela, la mention affiche « auteur inconnu », ce qui
ne satisfait pas la licence.

Une licence Premium lève cette obligation.
