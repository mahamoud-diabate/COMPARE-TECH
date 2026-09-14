'use strict';

/*
 * Liste blanche CORS.
 *
 * Module a part, comme auth.js, pagination.js et references.js : la decision
 * « cette origine a-t-elle le droit d'appeler l'API » se teste alors sans
 * demarrer de serveur.
 *
 * ------------------------------------------------------------------------
 * POURQUOI AUCUN MOTIF SUR *.vercel.app
 * ------------------------------------------------------------------------
 *
 * Une version precedente autorisait toute origine correspondant a
 * `https://compare-tech[a-z0-9-]*.vercel.app`. C'etait une liste blanche qui
 * ne filtrait plus rien : `vercel.app` est un domaine partage, et un nom d'hote
 * y est attribue au premier qui le demande. Creer un projet nomme
 * `compare-tech-evil` suffisait a obtenir une origine acceptee par l'API.
 *
 * Restreindre le motif ne repare pas le probleme. Meme un motif qui exige le
 * suffixe du compte — `compare-tech-*-king2mos-projects.vercel.app` — se
 * contourne : un projet personnel nomme `compare-tech-x-king2mos-projects`
 * recoit exactement ce nom d'hote, sans appartenir au compte.
 *
 * La seule regle sure sur un domaine partage est l'enumeration. Les URLs de
 * previsualisation, qui changent a chaque deploiement, passent par
 * CORS_ORIGINS — et le refus est journalise avec la marche a suivre, pour que
 * la cause soit lisible au lieu d'un echec muet dans le navigateur.
 */

// Domaines de production connus. Vercel sert le meme deploiement sous le nom
// court du projet et sous le nom porte par le compte : les deux comptent.
const ORIGINES_PRODUCTION = [
  'https://compare-tech-theta.vercel.app',
  'https://compare-tech-king2mos-projects.vercel.app',
];

// Ports de developpement. 5174 et 5175 comptent : Vite passe au port suivant
// des que 5173 est occupe — deux instances, ou un serveur oublie — et le CORS
// echouait alors sans que rien n'indique pourquoi.
const ORIGINES_DEV = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:4173',
];

/**
 * Construit la liste blanche effective.
 *
 * @param {object}  options
 * @param {string}  [options.corsOrigins]   contenu brut de CORS_ORIGINS
 * @param {boolean} [options.enProduction]  masque les origines localhost
 * @returns {string[]}
 */
function construitListeBlanche({ corsOrigins = '', enProduction = false } = {}) {
  const supplementaires = String(corsOrigins)
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  return [
    ...new Set([...ORIGINES_PRODUCTION, ...supplementaires, ...(enProduction ? [] : ORIGINES_DEV)]),
  ];
}

/**
 * L'origine a-t-elle le droit d'appeler l'API ?
 *
 * Une origine absente (`undefined`) n'est pas un navigateur : c'est un appel
 * serveur-a-serveur, curl, ou une navigation directe. Rien a proteger la — le
 * CORS ne defend que contre les pages tierces, et les ecritures exigent de
 * toute facon un jeton.
 *
 * La comparaison est stricte et sensible a la casse : les navigateurs
 * envoient l'origine en minuscules et sans barre oblique finale.
 *
 * @param {string|undefined} origine
 * @param {string[]} listeBlanche
 * @returns {boolean}
 */
function origineAutorisee(origine, listeBlanche = []) {
  if (!origine) return true;
  if (typeof origine !== 'string') return false;
  return listeBlanche.includes(origine);
}

module.exports = {
  ORIGINES_PRODUCTION,
  ORIGINES_DEV,
  construitListeBlanche,
  origineAutorisee,
};
