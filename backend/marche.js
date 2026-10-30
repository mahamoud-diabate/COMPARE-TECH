'use strict';

/*
 * Résumé statistique d'une collection : la logique vit désormais dans
 * `shared/marche.js`, partagée avec le frontend. Ce fichier ne fait que la
 * réexposer en CommonJS, pour que `server.js` et les tests du backend
 * continuent d'écrire `require('./marche')`.
 *
 * `require` d'un module ESM : natif depuis Node 20.19, sans option.
 */

const {
  CHAMPS_MARCHE,
  NB_BACS,
  MAX_PALIERS,
  SEUIL_BORNAGE,
  nombre,
  quantile,
  statistiques,
  resumeMarche,
} = require('../shared/marche.js');

module.exports = {
  CHAMPS_MARCHE,
  NB_BACS,
  MAX_PALIERS,
  SEUIL_BORNAGE,
  nombre,
  quantile,
  statistiques,
  resumeMarche,
};
