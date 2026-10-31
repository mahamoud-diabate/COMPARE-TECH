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

import { criteresDe, resolveType } from './criteres.js';

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
