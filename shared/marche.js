/*
 * Résumé statistique d'une collection, critère par critère : ce qui permet de
 * situer un produit « dans le marché » sans charger tout le catalogue.
 *
 * Déplacé de `backend/marche.js` vers ce module partagé : le serveur s'en sert
 * pour la route `/api/:segment/marche`, et le navigateur y lit les mêmes
 * seuils (paliers, colonnes, bornage). Le jour où la page comparative passera
 * par cette route, client et serveur découperont déjà les données de la même
 * façon.
 *
 * Les calculs sont purs — aucune base, aucun réseau : les règles de quantile
 * et de bornage se vérifient par des tests unitaires, sans démarrer MongoDB.
 */

import { CRITERES, SEGMENTS } from './criteres.js';

/**
 * Critères numériques de chaque collection, dérivés de `criteres.js`.
 *
 * Seuls les critères `comparables` y figurent : les unités de calcul des GPU
 * en sont absentes, car un cœur CUDA Nvidia et un stream processor AMD ne se
 * comparent pas — les placer sur un même axe affirmerait une hiérarchie qui
 * n'existe pas.
 *
 * `inverse` signale une mesure où la valeur la plus basse est la meilleure
 * (consommation en watts). Le calcul statistique est identique dans les deux
 * cas : c'est la lecture de l'axe qui s'inverse, pas la donnée.
 */
export const CHAMPS_MARCHE = Object.freeze(
  Object.fromEntries(
    Object.entries(SEGMENTS).map(([type, segment]) => [
      segment,
      CRITERES[type]
        .filter(cr => cr.comparable)
        .map(cr => ({
          key: cr.key,
          unite: cr.unite || (cr.nature === 'benchmark' ? 'points' : null),
          inverse: cr.inverse,
        })),
    ])
  )
);

// Une variable continue est découpée en 32 colonnes : assez pour montrer la
// forme d'une distribution sur 300 px de large, assez peu pour que le DOM
// reste identique à 100 fiches comme à 100 000.
export const NB_BACS = 32;

// En deçà de 12 valeurs distinctes, une mesure n'est pas continue mais
// discrète (cœurs, threads, mémoire vive) : un histogramme y inventerait des
// positions intermédiaires qui n'existent pas. On compte alors les effectifs
// par palier réel.
export const MAX_PALIERS = 12;

// Au-delà de 40 mesures, deux ou trois valeurs extrêmes (un serveur 96 cœurs,
// un portable de 2015) écraseraient l'axe et rendraient 95 % du catalogue
// illisible. Le domaine est alors borné entre P2 et P98, et les valeurs
// hors cadre sont comptées à part plutôt que silencieusement écartées.
export const SEUIL_BORNAGE = 40;

/**
 * Lit un nombre, ou renvoie null.
 *
 * Tolérant à dessein : des mesures importées avant la conversion du schéma
 * sont encore stockées en texte (« 6.8 pouces »), et une fiche à moitié
 * remplie ne doit surtout pas être comptée comme un zéro — ce qui la
 * classerait dernière du marché au lieu de la retirer du calcul.
 */
export function nombre(valeur) {
  if (typeof valeur === 'number') return Number.isFinite(valeur) ? valeur : null;
  if (typeof valeur !== 'string') return null;
  const texte = valeur.trim().replace(',', '.').replace(/\s/g, '');
  const trouve = /^-?\d+(?:\.\d+)?/.exec(texte);
  if (!trouve) return null;
  const n = Number(trouve[0]);
  return Number.isFinite(n) ? n : null;
}

/** Quantile par interpolation linéaire sur une série déjà triée. */
export function quantile(trie, q) {
  if (trie.length === 0) return null;
  const position = (trie.length - 1) * q;
  const bas = Math.floor(position);
  const haut = Math.ceil(position);
  if (bas === haut) return trie[bas];
  return trie[bas] + (trie[haut] - trie[bas]) * (position - bas);
}

/**
 * Résume une série de mesures.
 *
 * @param {Array<number|string|null>} valeurs mesures brutes (trous acceptés)
 * @param {{total?: number}} options effectif total de la collection, pour
 *   distinguer « 8 mesures sur 15 fiches » de « 8 mesures sur 8 fiches »
 * @returns {object} résumé sérialisable, directement consommable par le front
 */
export function statistiques(valeurs, options = {}) {
  const mesures = [];
  for (const brute of Array.isArray(valeurs) ? valeurs : []) {
    const n = nombre(brute);
    if (n !== null) mesures.push(n);
  }
  mesures.sort((a, b) => a - b);

  const total = Number.isInteger(options.total) ? options.total : mesures.length;
  const effectif = mesures.length;

  if (effectif === 0) {
    // Aucune mesure : on le dit. Renvoyer un résumé à zéro ferait afficher un
    // axe vide qui laisserait croire que tout le catalogue vaut 0.
    return {
      mesures: 0,
      total,
      manquantes: total,
      nature: 'vide',
      min: null,
      max: null,
      p2: null,
      p25: null,
      p50: null,
      p75: null,
      p98: null,
      domaine: null,
      borne: false,
      horsDomaine: 0,
      bacs: [],
      paliers: [],
    };
  }

  const min = mesures[0];
  const max = mesures[effectif - 1];

  // Valeurs distinctes, sans doublon : sert à décider du traitement discret.
  const distinctes = [];
  for (const v of mesures) {
    if (distinctes.length === 0 || distinctes[distinctes.length - 1] !== v) distinctes.push(v);
  }
  const discret = distinctes.length <= MAX_PALIERS;

  const p2 = quantile(mesures, 0.02);
  const p98 = quantile(mesures, 0.98);
  const borne = !discret && effectif > SEUIL_BORNAGE && p98 > p2;
  const domaine = borne ? [p2, p98] : [min, max];

  let bacs = [];
  let paliers = [];
  let horsDomaine = 0;

  if (discret) {
    paliers = distinctes.map(valeur => ({
      valeur,
      effectif: mesures.filter(v => v === valeur).length,
    }));
  } else {
    bacs = new Array(NB_BACS).fill(0);
    const amplitude = domaine[1] - domaine[0] || 1;
    for (const v of mesures) {
      if (v < domaine[0] || v > domaine[1]) {
        horsDomaine += 1;
        continue;
      }
      const rang = Math.min(NB_BACS - 1, Math.floor(((v - domaine[0]) / amplitude) * NB_BACS));
      bacs[rang] += 1;
    }
  }

  return {
    mesures: effectif,
    total,
    manquantes: Math.max(0, total - effectif),
    nature: discret ? 'discret' : 'continu',
    min,
    max,
    p2,
    p25: quantile(mesures, 0.25),
    p50: quantile(mesures, 0.5),
    p75: quantile(mesures, 0.75),
    p98,
    domaine,
    borne,
    horsDomaine,
    bacs,
    paliers,
  };
}

/**
 * Assemble le résumé d'une collection complète.
 *
 * @param {Array<object>} documents fiches lues en base (projection minimale)
 * @param {Array<{key: string, unite?: string, inverse?: boolean}>} champs
 * @param {number} total effectif de la collection
 */
export function resumeMarche(documents, champs, total) {
  const fiches = Array.isArray(documents) ? documents : [];
  const effectif = Number.isInteger(total) ? total : fiches.length;

  const criteres = {};
  for (const champ of champs) {
    const valeurs = fiches.map(fiche => (fiche ? fiche[champ.key] : null));
    criteres[champ.key] = {
      ...statistiques(valeurs, { total: effectif }),
      unite: champ.unite || null,
      inverse: Boolean(champ.inverse),
    };
  }

  return {
    total: effectif,
    genere_le: new Date().toISOString(),
    criteres,
  };
}
