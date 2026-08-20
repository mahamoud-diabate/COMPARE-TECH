/*
 * Fichiers d'icônes déposés dans `src/assets/icons/`.
 *
 * Séparé du composant qui les affiche : un module qui exporte à la fois des
 * composants et des constantes casse le rechargement à chaud de React, et la
 * lecture du dossier n'a de toute façon rien d'un composant.
 *
 * Vite résout ces globs au moment du build : le dossier n'est pas lu à
 * l'exécution, seuls les fichiers réellement présents entrent dans le bundle.
 */

// PNG : l'import par défaut donne une URL, l'image est affichée telle quelle.
const imagesPng = import.meta.glob('../assets/icons/*.png', {
  eager: true,
  import: 'default',
});

// SVG : `?raw` donne la source, insérée en ligne pour rester nette à toute
// taille.
const sourcesSvg = import.meta.glob('../assets/icons/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
});

const nomDe = (chemin) => chemin.split('/').pop().replace(/\.(png|svg)$/, '');

export const PNG = Object.fromEntries(
  Object.entries(imagesPng).map(([chemin, url]) => [nomDe(chemin), url])
);

export const SVG = Object.fromEntries(
  Object.entries(sourcesSvg).map(([chemin, source]) => [nomDe(chemin), source])
);

/** Noms des icônes effectivement fournies — sert à l'attribution en pied de page. */
export const iconesFournies = [...new Set([...Object.keys(PNG), ...Object.keys(SVG)])].sort();

export const utiliseIconesPersonnalisees = iconesFournies.length > 0;
