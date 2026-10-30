const mongoose = require('mongoose');
// Le .env vit a la racine du backend, quel que soit le dossier depuis lequel
// on lance la commande. Sans ce chemin explicite, dotenv le cherche dans le
// dossier courant : lance depuis la racine du depot, il ne trouve rien et
// echoue en annoncant une variable absente qui est pourtant bien la.
require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });

const Cpu = require('../models/Cpu');
const Gpu = require('../models/Gpu');
const Laptop = require('../models/Laptop');
const Telephone = require('../models/Telephone');
const { champsMesures, valideProduit } = require('../controles');
const { memeTexte, normaliseTexte, valeurPresente } = require('../../shared/provenance.js');

/*
 * Porte d'entree unique du catalogue.
 *
 * Toute donnee entre par ici, qu'elle vienne d'un clavier ou d'un agent : les
 * memes controles s'appliquent. C'est ce qui distingue une source d'une
 * suggestion — l'importateur ne fait pas confiance, il verifie.
 *
 * Six gardes, du moins cher au plus cher :
 *
 *  1. PROVENANCE OBLIGATOIRE — toute mesure chiffree doit declarer d'ou elle
 *     vient : URL, date, et l'EXTRAIT de la ligne qui la porte. Une valeur
 *     sans source est refusee, jamais ecrite. C'est ce garde qui rend
 *     impossible le retour du `Math.random()` : un nombre invente n'a pas
 *     d'URL.
 *
 *     La valeur doit de plus figurer DANS son propre extrait. C'est ce qui
 *     rattache un nombre a son libelle : 91 peut se trouver quelque part sur
 *     une page, il ne peut pas se trouver dans « Total Cores 24 ». Ce controle
 *     ne coute aucune requete.
 *
 *  2. CHAMPS CONNUS — un champ absent du schema est SUPPRIME sans un mot par
 *     Mongoose. Un fichier entier de mesures peut ainsi etre accepte, ecrit,
 *     et ne rien laisser en base. Perdre une donnee en silence est pire que la
 *     refuser : on refuse.
 *
 *  3. PLAGES DE VALIDITE — deleguees aux modeles Mongoose, qui les declarent
 *     deja. Une frequence de 570 GHz est une faute de frappe.
 *
 *  4. CONTROLE LITTERAL (--verifier) — la page annoncee est telechargee, et
 *     l'EXTRAIT doit y figurer tel quel. Combine au garde 1, cela forme une
 *     chaine complete : valeur ⊂ extrait ⊂ page. Une IA qui restitue un
 *     chiffre de memoire produit un nombre plausible ; elle ne produit pas une
 *     page qui contient la ligne ou il figurerait. Ce garde coute une requete
 *     par source, d'ou l'option.
 *
 *  5. QUARANTAINE DES ECARTS — une mesure deja en base qui bouge de plus de
 *     N % part en rapport, pas en production. Un processeur ne change pas de
 *     performance pendant la nuit : si le chiffre bouge, c'est le releve qui
 *     a derape.
 *
 *  6. COHERENCE DU LOT — chaque valeur est comparee a la mediane du fichier.
 *     C'est le seul garde qui regarde les produits ENSEMBLE : un nombre de
 *     coeurs de 91 au milieu de 24, 20, 16 et 8 ne viole aucune regle prise
 *     isolement, mais il detonne. Il signale sans jamais bloquer, et devient
 *     indispensable quand la collecte est repartie entre plusieurs agents,
 *     dont aucun ne voit plus d'un produit a la fois.
 *
 * Rien n'est ecrit sans `--ecrire`. Par defaut, l'outil montre le diff et se
 * tait.
 *
 * Usage :
 *   node scripts/import.js data/cpus.json
 *   node scripts/import.js data/cpus.json --verifier
 *   node scripts/import.js data/cpus.json --verifier --ecrire
 *   node scripts/import.js data/cpus.json --ecrire --seuil=25
 *   node scripts/import.js data/cpus.json --coherence=2
 */

const MODELES = { cpus: Cpu, gpus: Gpu, laptops: Laptop, telephones: Telephone };

const SEUIL_DEFAUT = 10;

// Garde 5 : ecart a la mediane du lot au-dela duquel une valeur est signalee.
const FACTEUR_DEFAUT = 4;

/* ------------------------------------------------------------------ *
 * Fonctions pures — testables sans base ni reseau
 * ------------------------------------------------------------------ */

/** Cle de rapprochement avec l'existant. Un produit, c'est un nom chez une marque. */
function cleNaturelle(produit) {
  const norme = v =>
    String(v || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  return `${norme(produit.brand)}::${norme(produit.name)}`;
}

/**
 * Garde 6 : la coherence du lot.
 *
 * Les cinq premiers gardes examinent chaque valeur isolement. Aucun ne peut
 * voir qu'un nombre de coeurs de 91 detonne au milieu de 24, 20, 16 et 8 —
 * pourtant c'est l'erreur la plus frequente, et la seule qu'un controle
 * automatique ne rattrapait pas : confondre la note d'un site comparatif avec
 * la mesure qu'elle commente.
 *
 * Le besoin devient criant quand la collecte est repartie entre plusieurs
 * agents : chacun ne voit qu'un produit, donc personne ne voit l'anomalie.
 *
 * Ce garde SIGNALE, il ne bloque jamais. Certains champs s'etalent
 * legitimement sur un facteur dix — le stockage d'un portable va de 256 Go a
 * 4 To. Un faux positif ne coute qu'un coup d'oeil ; un blocage couterait la
 * confiance dans l'outil.
 *
 * @returns {object[]} un signalement par valeur qui s'ecarte trop de la mediane
 */
function incoherencesDuLot(Model, produits, facteur = FACTEUR_DEFAUT) {
  const signalements = [];
  if (!(facteur > 1)) return signalements;

  for (const champ of champsMesures(Model)) {
    const valeurs = produits
      .map(p => p[champ])
      .filter(v => typeof v === 'number' && Number.isFinite(v) && v > 0);

    // En dessous de cinq releves, la mediane ne veut rien dire : deux valeurs
    // eloignees ne sont pas une anomalie, c'est un echantillon.
    if (valeurs.length < 5) continue;

    const triees = [...valeurs].sort((a, b) => a - b);
    const milieu = Math.floor(triees.length / 2);
    const mediane =
      triees.length % 2 === 1 ? triees[milieu] : (triees[milieu - 1] + triees[milieu]) / 2;
    if (!(mediane > 0)) continue;

    for (const produit of produits) {
      const valeur = produit[champ];
      if (typeof valeur !== 'number' || !Number.isFinite(valeur) || valeur <= 0) continue;

      const rapport = valeur > mediane ? valeur / mediane : mediane / valeur;
      if (rapport > facteur) signalements.push({ produit, champ, valeur, mediane, rapport });
    }
  }

  return signalements;
}

/**
 * Compare le fichier a la base.
 * @returns {{creations: object[], majs: object[], quarantaine: object[]}}
 */
function compareAuCatalogue(Model, produits, existants, seuilPct = SEUIL_DEFAUT) {
  const mesures = champsMesures(Model);
  const index = new Map(existants.map(doc => [cleNaturelle(doc), doc]));

  const creations = [];
  const majs = [];
  const quarantaine = [];

  for (const produit of produits) {
    const ancien = index.get(cleNaturelle(produit));
    if (!ancien) {
      creations.push(produit);
      continue;
    }

    const changements = [];
    const suspects = [];

    for (const champ of mesures) {
      const neuf = produit[champ];
      if (neuf === undefined || neuf === null) continue;
      const vieux = ancien[champ];
      if (vieux === undefined || vieux === null) {
        changements.push({ champ, vieux, neuf });
        continue;
      }
      if (vieux === neuf) continue;

      // Garde 4. Un ecart relatif au-dela du seuil n'est pas applique : il est
      // signale. Le denominateur ne peut pas etre nul, `vieux` etant non nul
      // des lors qu'il differe de `neuf` et qu'aucune mesure n'est negative.
      const ecart = vieux === 0 ? Infinity : (Math.abs(neuf - vieux) / Math.abs(vieux)) * 100;
      if (ecart > seuilPct) suspects.push({ champ, vieux, neuf, ecart });
      else changements.push({ champ, vieux, neuf });
    }

    if (suspects.length) quarantaine.push({ produit, ancien, suspects });
    if (changements.length) majs.push({ produit, ancien, changements });
  }

  return { creations, majs, quarantaine };
}

/* ------------------------------------------------------------------ *
 * Entrees / sorties
 * ------------------------------------------------------------------ */

const fs = require('node:fs');
const path = require('node:path');
const axios = require('axios');
const cheerio = require('cheerio');

function chargeFichier(chemin) {
  const brut = fs.readFileSync(chemin, 'utf-8');
  let contenu;
  try {
    contenu = JSON.parse(brut);
  } catch (err) {
    throw new Error(`${path.basename(chemin)} n'est pas un JSON valide : ${err.message}`);
  }

  const Model = MODELES[contenu.type];
  if (!Model) {
    throw new Error(
      `Type « ${contenu.type} » inconnu. Attendus : ${Object.keys(MODELES).join(', ')}.`
    );
  }
  if (!Array.isArray(contenu.produits)) {
    throw new Error('Le fichier doit contenir un tableau « produits ».');
  }
  return { type: contenu.type, produits: contenu.produits, Model };
}

/**
 * Garde 3 applique a tout un fichier. Les pages sont mises en cache : une meme
 * source sert souvent a plusieurs produits, et on ne la telecharge qu'une fois.
 */
async function verifieEnLigne(Model, produits) {
  const mesures = champsMesures(Model);
  const pages = new Map();
  const echecs = [];

  const texteDe = async url => {
    if (pages.has(url)) return pages.get(url);
    try {
      const { data } = await axios.get(url, {
        timeout: 20000,
        headers: { 'User-Agent': 'CompareTech/1.0 (verification de provenance)' },
      });
      // Normalise des la mise en cache : la comparaison se fait ensuite sur
      // deux textes traites de la meme facon, une fois par page et non une
      // fois par valeur.
      const texte = normaliseTexte(cheerio.load(data).text());
      pages.set(url, texte);
      return texte;
    } catch (err) {
      pages.set(url, null);
      echecs.push({ url, motif: `page injoignable (${err.message})` });
      return null;
    }
  };

  for (const produit of produits) {
    for (const champ of mesures) {
      const valeur = produit[champ];
      const source = produit.provenance && produit.provenance[champ];
      if (valeur === undefined || valeur === null || !source || !source.url || !source.extrait)
        continue;

      const texte = await texteDe(source.url);
      if (texte === null) continue; // deja signale par texteDe

      // On cherche l'EXTRAIT, pas seulement la valeur. Combine au controle
      // hors ligne (valeur incluse dans l'extrait), cela forme une chaine
      // complete : valeur ⊂ extrait ⊂ page. Un chiffre ne peut plus se
      // retrouver rattache au mauvais libelle.
      if (!memeTexte(texte, source.extrait)) {
        echecs.push({
          produit: produit.name,
          champ,
          valeur,
          url: source.url,
          motif: `extrait introuvable sur la page : « ${source.extrait} »`,
        });
      }
    }
  }

  return echecs;
}

const nb = v => (v === undefined || v === null ? '—' : String(v));

/** « Intel » + « Intel Core i9 » ne fait pas deux fois Intel. */
function etiquette(produit) {
  const nom = (produit && produit.name) || '(sans nom)';
  const marque = (produit && produit.brand) || '';
  if (!marque) return nom;
  return nom.toLowerCase().startsWith(marque.toLowerCase()) ? nom : `${marque} ${nom}`;
}

function affiche({ creations, majs, quarantaine }) {
  console.log(
    `\n  ${creations.length} creation(s), ${majs.length} mise(s) a jour, ` +
      `${quarantaine.length} en quarantaine.\n`
  );

  for (const p of creations) console.log(`  + ${etiquette(p)}`);
  if (creations.length) console.log('');

  for (const { produit, changements } of majs) {
    console.log(`  ~ ${etiquette(produit)}`);
    for (const c of changements) console.log(`      ${c.champ} : ${nb(c.vieux)} -> ${nb(c.neuf)}`);
  }
  if (majs.length) console.log('');

  for (const { produit, suspects } of quarantaine) {
    console.log(`  ! ${etiquette(produit)} — ecart important, NON applique :`);
    for (const s of suspects) {
      console.log(`      ${s.champ} : ${nb(s.vieux)} -> ${nb(s.neuf)}  (${s.ecart.toFixed(0)} %)`);
    }
  }
  if (quarantaine.length) {
    console.log('\n  Un ecart de cette taille vient presque toujours du releve, pas du materiel.');
    console.log("  Verifiez la source, puis relancez avec --seuil=<n> si l'ecart est reel.\n");
  }
}

function afficheIncoherences(signalements) {
  if (signalements.length === 0) return;

  console.log('');
  console.log(`  ${signalements.length} valeur(s) a verifier — elles detonnent dans le lot :`);
  console.log('');
  for (const s of signalements) {
    console.log(`  ? ${etiquette(s.produit)}`);
    console.log(
      `      ${s.champ} = ${s.valeur}  (mediane du lot : ${s.mediane}, ecart x${s.rapport.toFixed(1)})`
    );
  }
  console.log('');
  console.log("  Ce n'est pas un refus : certains champs varient legitimement beaucoup.");
  console.log('  Mais une note de site comparatif prise pour une mesure ressemble a ca.');
  console.log('');
}

async function ecrit(Model, creations, majs) {
  let crees = 0;
  for (const produit of creations) {
    // `create` et non `insertMany` : le slug est attribue au document, et une
    // erreur reste attribuable a un produit precis.
    await Model.create(produit);
    crees += 1;
  }

  let modifies = 0;
  for (const { ancien, produit, changements } of majs) {
    const $set = {};
    for (const { champ } of changements) {
      $set[champ] = produit[champ];
      const source = produit.provenance && produit.provenance[champ];
      if (source) $set[`provenance.${champ}`] = source;
    }
    // Le slug n'est jamais recalcule : une adresse qui change a chaque
    // correction de fiche ne vaudrait pas mieux qu'un identifiant Mongo.
    await Model.updateOne({ _id: ancien._id }, { $set });
    modifies += 1;
  }

  console.log(`  ${crees} produit(s) cree(s), ${modifies} mis a jour.`);
}

async function main() {
  const args = process.argv.slice(2);
  const chemin = args.find(a => !a.startsWith('--'));
  const ecrire = args.includes('--ecrire');
  const verifier = args.includes('--verifier');
  const seuilArg = args.find(a => a.startsWith('--seuil='));
  const seuil = seuilArg ? Number(seuilArg.split('=')[1]) : SEUIL_DEFAUT;
  const cohArg = args.find(a => a.startsWith('--coherence='));
  const facteur = cohArg ? Number(cohArg.split('=')[1]) : FACTEUR_DEFAUT;

  if (!chemin) {
    console.error(
      'Usage : node scripts/import.js <fichier.json> [--verifier] [--ecrire] [--seuil=10] [--coherence=4]'
    );
    process.exitCode = 1;
    return;
  }
  if (!Number.isFinite(seuil) || seuil < 0) {
    console.error(`Seuil illisible : « ${seuilArg} ».`);
    process.exitCode = 1;
    return;
  }

  const { type, produits, Model } = chargeFichier(chemin);
  console.log(`\n${produits.length} produit(s) lus dans ${path.basename(chemin)} (type ${type}).`);

  // Gardes 1 a 3, hors ligne.
  const refuses = [];
  const retenus = [];
  for (const produit of produits) {
    const erreurs = valideProduit(Model, produit);
    if (erreurs.length) refuses.push({ produit, erreurs });
    else retenus.push(produit);
  }

  if (refuses.length) {
    console.log(`\n  ${refuses.length} produit(s) refuse(s) :\n`);
    for (const { produit, erreurs } of refuses) {
      console.log(`  x ${etiquette(produit)}`);
      for (const e of erreurs) console.log(`      ${e}`);
    }
  }

  if (retenus.length === 0) {
    console.log('\nRien a importer.\n');
    process.exitCode = refuses.length ? 1 : 0;
    return;
  }

  // Garde 6 : la coherence interne du lot. Purement consultatif, mais place
  // avant les controles couteux — c'est souvent lui qui vous fera relire.
  afficheIncoherences(incoherencesDuLot(Model, retenus, facteur));

  // Garde 4, en ligne, avant tout contact avec la base : inutile d'ouvrir une
  // connexion pour des donnees qui ne passeront pas le controle.
  if (verifier) {
    console.log(`\nVerification des sources de ${retenus.length} produit(s)...`);
    const echecs = await verifieEnLigne(Model, retenus);
    if (echecs.length) {
      console.log(`\n  ${echecs.length} valeur(s) introuvable(s) a la source :\n`);
      for (const e of echecs) {
        const tete = e.produit ? `${e.produit} — ${e.champ} = ${e.valeur}` : e.url;
        console.log(`  x ${tete}`);
        console.log(`      ${e.motif}`);
        console.log(`      ${e.url}`);
      }
      console.log('\n  Import interrompu : une valeur qui ne figure pas sur la page annoncee');
      console.log("  n'est pas un releve, quelle qu'en soit la source.\n");
      process.exitCode = 1;
      return;
    }
    console.log('  Tous les extraits figurent sur les pages annoncees.');
  }

  if (!process.env.DB_URI) {
    console.error('');
    console.error('DB_URI absent : impossible de comparer au catalogue existant.');
    console.error('Renseignez-le dans backend/.env avant de relancer.');
    console.error('');
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(process.env.DB_URI);
  try {
    const existants = await Model.find({}).lean();
    const bilan = compareAuCatalogue(Model, retenus, existants, seuil);
    affiche(bilan);

    if (!ecrire) {
      console.log("  Rien n'a ete ecrit. Relancez avec --ecrire pour appliquer.\n");
      return;
    }
    await ecrit(Model, bilan.creations, bilan.majs);
    console.log('');
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error(`\nEchec de l'import : ${err.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  champsMesures,
  cleNaturelle,
  valideProduit,
  normaliseTexte,
  valeurPresente,
  compareAuCatalogue,
  incoherencesDuLot,
  memeTexte,
  MODELES,
  FACTEUR_DEFAUT,
  SEUIL_DEFAUT,
  chargeFichier,
  verifieEnLigne,
};
