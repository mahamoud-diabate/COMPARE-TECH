/*
 * Point d'entrée des règles partagées par le backend et le frontend.
 *
 *   criteres.js  ce que chaque mesure veut dire : nature, unité, sens, plafond
 *   formules.js  comment une note sur 100 se calcule à partir des critères
 *   marche.js    comment une collection se résume (quantiles, histogrammes)
 *   provenance.js  ce qui prouve une valeur : source, extrait, origine, protocole
 *
 * Côté backend (CommonJS) : `require('../shared/index.js')`, possible depuis
 * Node 20.19 sans option, tant qu'aucun de ces fichiers n'utilise d'`await`
 * au premier niveau.
 * Côté frontend : import relatif, résolu par Vite comme par `node --test`.
 */

export * from './criteres.js';
export * from './formules.js';
export * from './marche.js';
export * from './provenance.js';
