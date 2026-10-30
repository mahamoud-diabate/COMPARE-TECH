'use strict';

/*
 * Controles d'une fiche avant ecriture en base.
 *
 * Un seul jeu de regles pour toutes les portes d'entree : l'importateur
 * (`scripts/import.js`) et les routes d'ecriture de l'API (POST et PUT, donc
 * aussi le panneau d'administration). Avant ce module, l'importateur
 * verifiait tout et l'API rien : une fiche saisie dans l'admin pouvait
 * n'avoir aucune source.
 */

const { controleProvenance, controleQualification } = require('../shared/provenance.js');
const { criteresDe } = require('../shared/criteres.js');

// Champs numeriques ajoutes par le socle ou par Mongo, qui ne sont pas des
// mesures relevees et n'ont donc pas a declarer de source.
const HORS_MESURE = new Set(['__v']);

/** Les champs d'un modele qui constituent des mesures relevees. */
function champsMesures(Model) {
  return Object.entries(Model.schema.paths)
    .filter(([nom, chemin]) => chemin.instance === 'Number' && !HORS_MESURE.has(nom))
    .map(([nom]) => nom);
}

/**
 * Controle un produit du fichier avant tout contact avec la base.
 * @returns {string[]} la liste des motifs de refus, vide si le produit passe.
 */
function valideProduit(Model, produit) {
  const erreurs = [];

  if (!produit || typeof produit !== 'object') return ["entree qui n'est pas un objet"];
  if (!produit.name) erreurs.push('nom absent');
  if (!produit.brand) erreurs.push('marque absente');

  // Un champ que le modele ne connait pas est SUPPRIME sans un mot par
  // Mongoose. Un fichier entier de mesures peut ainsi etre accepte, ecrit, et
  // ne rien laisser en base. Perdre une donnee en silence est pire que la
  // refuser : on refuse.
  const connus = new Set(Object.keys(Model.schema.paths).map(chemin => chemin.split('.')[0]));
  for (const champ of Object.keys(produit)) {
    if (!connus.has(champ)) {
      erreurs.push(
        `${champ} : champ inconnu du modele — il serait perdu a l'ecriture. ` +
          `Ajoutez-le au schema, ou retirez-le du fichier.`
      );
    }
  }

  // Garde 2 : les plages declarees par le modele. `validateSync` n'ouvre pas
  // de connexion — le controle reste utilisable hors ligne.
  const erreurSchema = new Model(produit).validateSync();
  if (erreurSchema) {
    for (const [champ, detail] of Object.entries(erreurSchema.errors)) {
      if (champ === 'slug') continue; // attribue a l'ecriture
      if (champ.startsWith('provenance.')) continue; // message plus clair plus bas
      erreurs.push(`${champ} : ${detail.message}`);
    }
  }

  erreurs.push(...controleProvenance(champsMesures(Model), produit));
  // Origine, protocole, version, archive : facultatifs, mais valables s'ils
  // sont donnes. `modelName` (« Laptop ») designe la categorie dans criteres.js.
  erreurs.push(...controleQualification(criteresDe(Model.modelName.toLowerCase()), produit));

  return erreurs;
}

module.exports = { champsMesures, valideProduit, HORS_MESURE };
