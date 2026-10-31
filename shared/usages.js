/*
 * Notes par usage : « lequel est le meilleur POUR CE QUE JE VEUX EN FAIRE ? ».
 *
 * Décisions du 31 octobre 2026 (docs/PROPOSITION-USAGES.md) :
 *  - un profil ne repose que sur des MESURES (benchmarks, tests de
 *    laboratoire), jamais sur une spec papier ni sur une valeur par défaut ;
 *  - une mesure manquante rend le profil « non noté », jamais 0 ;
 *  - une mesure relevée avec un autre test que celui de référence du critère
 *    n'est pas utilisée : deux tests différents ne se comparent pas ;
 *  - plusieurs mesures se combinent par MOYENNE GÉOMÉTRIQUE pondérée : un
 *    produit très fort sur un test ne masque pas une faiblesse sur l'autre ;
 *  - chaque mesure est rapportée à un BARÈME VERSIONNÉ, affiché sous la note.
 *    Le barème v1 vaut 100 pour la meilleure valeur du catalogue d'octobre
 *    2026. Un produit plus récent peut le dépasser : la note dépasse alors
 *    100, honnêtement, et c'est le signal qu'il faut publier un barème v2. On
 *    ne bloque plus personne à 100 comme le faisaient les plafonds.
 *
 * La note globale (formules.js) reste affichée, en résumé secondaire.
 */

import { criteresDe, equivalents, resolveType } from './criteres.js';

export const BAREME = Object.freeze({
  version: 'v1',
  date: 'octobre 2026',
  // Meilleure valeur de chaque mesure dans le catalogue vérifié du
  // 31 octobre 2026 (backend/data/*.json). Ne pas recalculer à chaque import :
  // un barème qui bouge avec le catalogue ferait varier toutes les notes sans
  // qu'aucun produit n'ait changé.
  references: Object.freeze({
    cpu: Object.freeze({
      cinebench_2024_multi: 2320,
      geekbench_multi: 23095,
      geekbench_single: 3418,
    }),
    gpu: Object.freeze({ fps_1080p: 217, fps_1440p: 177, fps_4k: 106 }),
    laptop: Object.freeze({
      battery_life_hours: 23.22,
      display_brightness_nits: 623.3,
      geekbench_multi: 22850,
    }),
    telephone: Object.freeze({ geekbench_multi: 8789, geekbench_single: 3507 }),
  }),
});

const p = (id, titre, description, termes) =>
  Object.freeze({ id, titre, description, termes: Object.freeze(termes) });

/*
 * Profils par catégorie. Les profils pour lesquels aucune mesure n'existe
 * encore (Jeu pour les CPU et les portables, Autonomie et Photo pour les
 * téléphones, Création pour les GPU) ne figurent pas ici : décision Q3, ils
 * apparaîtront avec leur mesure.
 */
export const PROFILS = Object.freeze({
  cpu: Object.freeze([
    p('creation', 'Création & calcul lourd', 'Rendu 3D, montage vidéo, compilation', [
      { key: 'cinebench_2024_multi', poids: 0.5 },
      { key: 'geekbench_multi', poids: 0.5 },
    ]),
    p('reactivite', 'Réactivité au quotidien', 'Navigation, bureautique, une tâche à la fois', [
      { key: 'geekbench_single', poids: 1 },
    ]),
  ]),
  gpu: Object.freeze([
    p('jeu', 'Jeu vidéo', 'Images par seconde en réglages Ultra, surtout en 1440p', [
      { key: 'fps_1440p', poids: 0.5 },
      { key: 'fps_1080p', poids: 0.25 },
      { key: 'fps_4k', poids: 0.25 },
    ]),
  ]),
  laptop: Object.freeze([
    p('mobilite', 'Mobilité', 'Autonomie mesurée en navigation Wi-Fi, écran lisible dehors', [
      { key: 'battery_life_hours', poids: 0.7 },
      { key: 'display_brightness_nits', poids: 0.3 },
    ]),
    p('performance', 'Performance', 'Calcul sur tous les cœurs', [
      { key: 'geekbench_multi', poids: 1 },
    ]),
  ]),
  telephone: Object.freeze([
    p('performance', 'Performance', 'Applications lourdes et réactivité', [
      { key: 'geekbench_multi', poids: 0.7 },
      { key: 'geekbench_single', poids: 0.3 },
    ]),
  ]),
});

/** Profils d'une catégorie (liste vide si le type est inconnu). */
export function profilsDe(productType) {
  const type = resolveType(productType);
  return type ? PROFILS[type] : [];
}

/**
 * Valeur d'une mesure utilisable dans un profil, ou null.
 * Exige un nombre strictement positif et, si la source précise un test, que
 * ce soit le test de RÉFÉRENCE du critère (le premier de sa liste).
 */
export function mesureUtilisable(produit, type, key) {
  const brute = produit ? produit[key] : undefined;
  const valeur = typeof brute === 'string' ? Number(brute) : brute;
  if (!(Number.isFinite(valeur) && valeur > 0)) return null;

  const critere = criteresDe(type).find(cr => cr.key === key);
  const protocole = produit.provenance && produit.provenance[key]?.protocole;
  if (protocole && critere && critere.protocoles.length && protocole !== critere.protocoles[0]) {
    return null;
  }
  return valeur;
}

/**
 * Note d'un profil pour un produit.
 * @returns {{id, titre, description, note: number|null, termes: object[], manquants: string[], bareme: string}}
 */
export function noteProfil(produit, productType, profil) {
  const type = resolveType(productType);
  const refs = (type && BAREME.references[type]) || {};
  const termes = profil.termes.map(({ key, poids }) => {
    const valeur = type ? mesureUtilisable(produit, type, key) : null;
    return { key, poids, valeur, reference: refs[key] ?? null };
  });
  const manquants = termes.filter(t => t.valeur === null || !t.reference).map(t => t.key);

  let note = null;
  if (manquants.length === 0) {
    const log = termes.reduce((s, t) => s + t.poids * Math.log(t.valeur / t.reference), 0);
    note = Math.round(100 * Math.exp(log));
  }

  return {
    id: profil.id,
    titre: profil.titre,
    description: profil.description,
    note,
    termes,
    manquants,
    bareme: `barème ${BAREME.version} (${BAREME.date})`,
  };
}

/** Toutes les notes par usage d'un produit, dans l'ordre des profils. */
export function notesParUsage(produit, productType) {
  return profilsDe(productType).map(profil => noteProfil(produit, productType, profil));
}

/**
 * Produits en tête d'une comparaison : la meilleure note, et toute note
 * équivalente (moins de 3 % d'écart). Une note de 0 (« non noté ») n'est
 * jamais en tête.
 *
 * @param {number[]} notes  une note par produit, dans l'ordre de la comparaison
 * @returns {number[]} les index des produits en tête ; vide si aucun n'est noté
 */
export function indexMeneurs(notes) {
  const meilleure = Math.max(0, ...notes);
  if (meilleure <= 0) return [];
  return notes
    .map((note, i) => (note > 0 && (note === meilleure || equivalents(note, meilleure)) ? i : -1))
    .filter(i => i >= 0);
}

/**
 * Verdict d'une comparaison, usage par usage.
 *
 * La note globale désignait un seul vainqueur, même quand chacun gagnait sur
 * un terrain différent (un portable de jeu « meilleur » qu'un ultraportable,
 * alors qu'il tient 4 h sur batterie contre 19). Ici, chaque profil a son
 * gagnant ; la phrase ne nomme un vainqueur unique que s'il gagne partout.
 * Zone d'égalité de 3 % comprise (`indexMeneurs`).
 *
 * @returns {string|null} la phrase, ou null si aucun profil n'est noté pour
 *   au moins deux produits (on retombe alors sur la note globale)
 */
export function verdictParUsage(produits, productType) {
  if (!Array.isArray(produits) || produits.length < 2) return null;
  const parProduit = produits.map(p => notesParUsage(p, productType));
  const nbProfils = parProduit[0]?.length || 0;

  const resultats = [];
  for (let k = 0; k < nbProfils; k++) {
    const profil = parProduit[0][k];
    const notes = parProduit.map(n => n[k].note);
    if (notes.filter(n => n !== null).length < 2) continue; // pas de comparaison possible
    const meneurs = indexMeneurs(notes.map(n => n ?? 0));
    const triees = notes.filter(n => n !== null).sort((a, b) => b - a);
    resultats.push({ titre: profil.titre, meneurs, meilleure: triees[0], suivante: triees[1] });
  }
  if (resultats.length === 0) return null;

  const nom = i => produits[i].name;
  const tranches = resultats.filter(r => r.meneurs.length === 1);
  const gagnants = new Set(tranches.map(r => r.meneurs[0]));
  const egalites = resultats.filter(r => r.meneurs.length > 1);

  const phraseEgalites = egalites.length
    ? ` Égalité en ${egalites.map(r => `« ${r.titre} »`).join(' et ')} (moins de 3 % d’écart).`
    : '';

  if (tranches.length === 0) {
    return `Égalité sur tous les usages notés (moins de 3 % d’écart).`;
  }
  if (gagnants.size === 1) {
    const i = [...gagnants][0];
    const detail = tranches
      .map(r => `« ${r.titre} » (${r.meilleure} contre ${r.suivante})`)
      .join(', ');
    return egalites.length
      ? `${nom(i)} l’emporte en ${detail}.${phraseEgalites}`
      : `${nom(i)} l’emporte sur tous les usages notés : ${detail}.`;
  }
  const detail = tranches
    .map(r => `${nom(r.meneurs[0])} en « ${r.titre} » (${r.meilleure} contre ${r.suivante})`)
    .join('. ');
  return `Pas de vainqueur unique. ${detail}.${phraseEgalites}`;
}
