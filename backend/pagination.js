'use strict';

/*
 * Pagination facultative des collections : `?limit=50&page=2`.
 *
 * Sans parametre, l'appelant recoit la collection entiere comme avant — le
 * front recupere chaque catalogue d'un bloc pour sa recherche instantanee, et
 * changer ce comportement par defaut le casserait. La pagination est donc une
 * capacite offerte aux futurs appelants, pas une rupture imposee aux actuels.
 *
 * Module a part plutot que fonction interne a server.js : les regles de
 * validation se testent alors sans demarrer de serveur ni de base, comme
 * celles de auth.js.
 */

// `limit` est plafonne : sans plafond, `?limit=100000` couterait aussi cher
// que l'absence de pagination, et la pagination ne protegerait plus rien.
const LIMITE_MAX = 200;

// Lit un entier strict. Number('12.5') et Number('abc') ne passent pas : une
// valeur approximative serait silencieusement arrondie par Mongo.
function entierStrict(valeur, defaut) {
  if (valeur === undefined) return defaut;
  if (typeof valeur !== 'string' && typeof valeur !== 'number') return NaN;
  const n = Number(valeur);
  return Number.isInteger(n) ? n : NaN;
}

/**
 * Traduit `req.query` en instructions Mongo.
 *
 * @returns {{limit: number, skip: number} | {erreur: string}}
 *   `limit: 0` signifie « pas de pagination, tout renvoyer ».
 */
function lecturePaginee(query = {}) {
  const { limit: limitBrut, page: pageBrut } = query;

  // Aucun des deux parametres : comportement historique, collection entiere.
  if (limitBrut === undefined && pageBrut === undefined) {
    return { limit: 0, skip: 0 };
  }

  const limit = entierStrict(limitBrut, LIMITE_MAX);
  const page = entierStrict(pageBrut, 1);

  if (!Number.isInteger(limit) || limit < 1 || limit > LIMITE_MAX) {
    return { erreur: `Le parametre limit doit etre un entier entre 1 et ${LIMITE_MAX}.` };
  }
  if (!Number.isInteger(page) || page < 1) {
    return { erreur: 'Le parametre page doit etre un entier superieur ou egal a 1.' };
  }
  return { limit, skip: (page - 1) * limit };
}

module.exports = { lecturePaginee, LIMITE_MAX };
