/*
 * Socle commun aux quatre catalogues (CPU, GPU, portables, telephones).
 *
 * Deux choses que tout produit doit porter, quel que soit son type :
 *
 *  - un SLUG, pour que l'URL d'une fiche survive a un reimport. Tant que les
 *    adresses contiennent l'identifiant Mongo, vider puis recharger une
 *    collection change toutes les URLs du site : les liens partages meurent et
 *    le referencement repart de zero. Le slug est derive du nom, donc stable.
 *
 *  - une PROVENANCE. Un comparateur se juge sur « d'ou vient ce chiffre ? ».
 *    Sans ce champ, une mesure relevee sur une source serieuse et une mesure
 *    inventee sont indiscernables une fois en base — c'est exactement ce qui
 *    est arrive au catalogue de demonstration.
 *
 * La provenance est portee par CHAQUE MESURE, et non par le document. Un
 * releve par lot aurait suffi tant qu'un import valait une source unique ;
 * des lors qu'un agent va chercher la frequence sur le site du fondeur et le
 * benchmark sur un agregateur, une source par document ne veut plus rien dire.
 *
 * Chaque entree porte l'URL, la date, et l'extrait de texte d'ou sort la
 * valeur. Ce dernier champ est ce qui permet a `scripts/import.js` de
 * REVERIFIER un chiffre au lieu de croire celui qui le fournit.
 */

const { Schema } = require('mongoose');

/**
 * Nom lisible -> segment d'URL. « AMD Ryzen 7 7800X3D » -> « amd-ryzen-7-7800x3d ».
 * Les accents sont deposes avant translitteration, sinon « e » et « é »
 * donneraient deux slugs differents pour le meme produit.
 */
function sluggify(nom) {
  return String(nom || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Slug libre pour ce modele : ajoute un suffixe numerique en cas de collision.
 * `pris` permet d'ecarter aussi les slugs attribues plus tot dans le meme lot,
 * qui ne sont pas encore en base au moment ou on interroge.
 */
async function slugLibre(Model, nom, pris = new Set()) {
  const base = sluggify(nom) || 'produit';
  let candidat = base;
  let n = 2;

  // Borne haute : au-dela, c'est que quelque chose ne va pas dans les noms
  // fournis, et une boucle sans fin serait pire qu'une erreur.
  while (n < 100) {
    const libre = !pris.has(candidat) && !(await Model.exists({ slug: candidat }));
    if (libre) {
      pris.add(candidat);
      return candidat;
    }
    candidat = `${base}-${n}`;
    n += 1;
  }
  throw new Error(`Impossible d'attribuer un slug unique pour « ${nom} ».`);
}

/**
 * Tolerance aux anciennes valeurs stockees en texte.
 *
 * Les premiers imports ont ecrit des mesures sous forme de chaines, unite
 * comprise : « 5.7 », « 6.8 pouces », « 6,7 pouces ». Passer ces champs en
 * `Number` sans precaution ne leve aucune erreur — Mongoose met simplement le
 * champ a `undefined` des que la chaine contient autre chose qu'un nombre, et
 * la diagonale d'ecran disparait des fiches sans que rien ne le signale.
 *
 * Ce crochet s'execute sur le document BRUT, avant conversion : il en extrait
 * le nombre. La base peut donc etre migree plus tard, ou jamais, sans que le
 * site perde une donnee au passage. Une chaine sans chiffre (« inconnu »)
 * devient `undefined` et non `0` : une mesure absente n'est pas une mesure
 * nulle.
 */
function tolereLesMesuresEnTexte(schema) {
  let champs = null;

  schema.pre('init', function convertitLesChaines(brut) {
    if (!brut || typeof brut !== 'object') return;

    if (champs === null) {
      champs = Object.entries(schema.paths)
        .filter(([, chemin]) => chemin.instance === 'Number')
        .map(([nom]) => nom);
    }

    for (const champ of champs) {
      const valeur = brut[champ];
      if (typeof valeur !== 'string') continue;
      const trouve = valeur.replace(',', '.').match(/-?\d+(\.\d+)?/);
      brut[champ] = trouve ? parseFloat(trouve[0]) : undefined;
    }
  });
}

/**
 * Plugin Mongoose : ajoute slug + provenance et les remplit a l'ecriture.
 *
 * `sparse` sur l'index unique n'est pas un detail : sans lui, tous les
 * documents deja en base — qui n'ont pas de slug — compteraient comme autant
 * de doublons de `null` et le second refuserait de s'ecrire.
 */
function catalogue(schema) {
  schema.add({
    slug: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
    provenance: {
      type: Map,
      of: new Schema({
        url: { type: String, trim: true, required: true },
        releve_le: { type: Date, required: true },
        // Le texte exact lu sur la page. C'est lui qui rend la valeur
        // verifiable plus tard, sans avoir a refaire le releve a la main.
        extrait: { type: String, trim: true },
      }, { _id: false }),
      default: undefined,
    },
  });

  // Ecriture unitaire (create, save, panneau d'administration).
  tolereLesMesuresEnTexte(schema);

  schema.pre('validate', async function attribueSlug() {
    if (this.slug) return;
    this.slug = await slugLibre(this.constructor, this.name);
  });

  // Import en lot : `insertMany` ne passe pas par les hooks de document, il
  // faut donc traiter le tableau brut. Le `Set` evite qu'un lot contenant deux
  // fois le meme nom produise deux fois le meme slug.
  schema.pre('insertMany', async function attribueSlugsEnLot(next, docs) {
    if (!Array.isArray(docs)) return next();
    try {
      const pris = new Set();
      for (const doc of docs) {
        if (!doc || doc.slug) continue;
        doc.slug = await slugLibre(this, doc.name, pris);
      }
      next();
    } catch (err) {
      next(err);
    }
  });
}

module.exports = { catalogue, sluggify, slugLibre };
