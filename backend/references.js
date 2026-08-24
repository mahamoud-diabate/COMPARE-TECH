'use strict';

/*
 * Reference d'un produit : identifiant Mongo ou slug.
 *
 * Les deux formes circulent dans les URLs du site, et pour une raison qui
 * n'est pas cosmetique : l'`_id` est reattribue a chaque rechargement de la
 * collection, alors que le slug est derive du nom et traverse l'operation
 * intact. Un lien partage, mis en favori ou indexe doit donc pouvoir porter
 * l'une ou l'autre — les anciennes adresses portent l'identifiant, les
 * nouvelles le slug, et les documents importes avant l'ajout du champ n'ont
 * pas encore de slug du tout.
 *
 * Module a part : ces regles se testent sans base ni serveur, comme celles de
 * auth.js et pagination.js. C'est aussi ce qui garantit qu'une seule
 * definition du format de slug circule dans le backend.
 */

const mongoose = require('mongoose');

// Forme attendue d'un slug. Le parametre d'URL est une chaine libre : la
// contraindre ici evite qu'elle parte telle quelle dans une requete Mongo.
const SLUG_VALIDE = /^[a-z0-9][a-z0-9-]{0,79}$/;

const estIdentifiant = cle => mongoose.Types.ObjectId.isValid(cle);

const estSlug = cle => typeof cle === 'string' && !estIdentifiant(cle) && SLUG_VALIDE.test(cle);

const estReference = cle => estIdentifiant(cle) || estSlug(cle);

/**
 * Trie un lot de references en identifiants et en slugs, en ecartant le reste.
 *
 * @param {unknown} references
 * @returns {{identifiants: string[], slugs: string[]}}
 */
function separeReferences(references) {
  const cles = Array.isArray(references) ? references.filter(cle => typeof cle === 'string') : [];

  return {
    identifiants: cles.filter(estIdentifiant),
    slugs: cles.filter(estSlug),
  };
}

/**
 * Filtre Mongo correspondant a un lot de references.
 *
 * @returns {object|null} `null` quand aucune reference n'est exploitable —
 *   l'appelant doit alors refuser la requete plutot que d'interroger la base
 *   avec un filtre vide, qui renverrait la collection entiere.
 */
function filtreReferences(references) {
  const { identifiants, slugs } = separeReferences(references);

  const conditions = [];
  if (identifiants.length > 0) conditions.push({ _id: { $in: identifiants } });
  if (slugs.length > 0) conditions.push({ slug: { $in: slugs } });

  if (conditions.length === 0) return null;
  return conditions.length === 1 ? conditions[0] : { $or: conditions };
}

module.exports = {
  SLUG_VALIDE,
  estIdentifiant,
  estSlug,
  estReference,
  separeReferences,
  filtreReferences,
};
