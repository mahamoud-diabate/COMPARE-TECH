'use strict';

// Tests du socle commun aux catalogues (models/catalogue.js) : fabrication des
// slugs, resolution des collisions, et tolerance aux mesures stockees en texte.
// Aucune connexion MongoDB : le modele est remplace par un mock pour `slugLibre`,
// et `hydrate()` suffit pour verifier le crochet de lecture.
const { test } = require('node:test');
const assert = require('node:assert');
const { sluggify, slugLibre } = require('../models/catalogue');
const Telephone = require('../models/Telephone');

/** Modele factice : ne connait que les slugs qu'on lui declare. */
const modeleAvec = (...slugs) => {
  const pris = new Set(slugs);
  return { exists: async ({ slug }) => (pris.has(slug) ? { _id: 1 } : null) };
};

test('sluggify transforme un nom de produit en segment d\'URL', () => {
  assert.strictEqual(sluggify('AMD Ryzen 7 7800X3D'), 'amd-ryzen-7-7800x3d');
});

test('sluggify depose les accents plutot que de les supprimer', () => {
  // Sans normalisation, « Téléphone » et « Telephone » donneraient deux slugs
  // differents pour le meme produit.
  assert.strictEqual(sluggify('Téléphone à Écran'), 'telephone-a-ecran');
});

test('sluggify reduit toute suite de caracteres non alphanumeriques a un tiret', () => {
  assert.strictEqual(sluggify('Intel® Core™ i7-14700K'), 'intel-core-i7-14700k');
});

test('sluggify ne laisse pas de tiret en tete ni en queue', () => {
  assert.strictEqual(sluggify('  --- RTX 4090 !!! '), 'rtx-4090');
});

test('sluggify borne la longueur a 80 caracteres', () => {
  assert.strictEqual(sluggify('a'.repeat(200)).length, 80);
});

test('sluggify renvoie une chaine vide pour une entree vide ou absente', () => {
  assert.strictEqual(sluggify(undefined), '');
  assert.strictEqual(sluggify(''), '');
});

test('slugLibre renvoie le slug de base quand il est disponible', async () => {
  assert.strictEqual(await slugLibre(modeleAvec(), 'RTX 4090'), 'rtx-4090');
});

test('slugLibre suffixe le slug deja pris en base', async () => {
  assert.strictEqual(await slugLibre(modeleAvec('rtx-4090'), 'RTX 4090'), 'rtx-4090-2');
});

test('slugLibre saute autant de suffixes que necessaire', async () => {
  const modele = modeleAvec('rtx-4090', 'rtx-4090-2', 'rtx-4090-3');
  assert.strictEqual(await slugLibre(modele, 'RTX 4090'), 'rtx-4090-4');
});

test('slugLibre tient compte des slugs attribues plus tot dans le meme lot', async () => {
  // Un import en lot n'a encore rien ecrit en base : sans ce jeu de slugs
  // deja pris, deux produits homonymes recevraient le meme slug et le second
  // serait rejete par l'index unique.
  const pris = new Set();
  const modele = modeleAvec();
  assert.strictEqual(await slugLibre(modele, 'RTX 4090', pris), 'rtx-4090');
  assert.strictEqual(await slugLibre(modele, 'RTX 4090', pris), 'rtx-4090-2');
});

test('slugLibre retombe sur « produit » quand le nom ne donne aucun slug', async () => {
  assert.strictEqual(await slugLibre(modeleAvec(), '!!!'), 'produit');
});

test('une mesure stockee en texte est lue comme un nombre', () => {
  // Les premiers imports ecrivaient « 6.8 pouces ». Sans le crochet pre-init,
  // Mongoose met le champ a undefined sans rien signaler.
  const doc = Telephone.hydrate({ name: 'Essai', brand: 'X', display_size: '6.8 pouces' });
  assert.strictEqual(doc.display_size, 6.8);
});

test('la virgule decimale est acceptee comme separateur', () => {
  const doc = Telephone.hydrate({ name: 'Essai', brand: 'X', display_size: '6,7 pouces' });
  assert.strictEqual(doc.display_size, 6.7);
});

test('un texte sans chiffre devient absent, pas zero', () => {
  // Un 0 ferait passer une donnee manquante pour un ecran de taille nulle, et
  // le produit perdrait la comparaison sur ce critere.
  const doc = Telephone.hydrate({ name: 'Essai', brand: 'X', display_size: 'inconnu' });
  assert.strictEqual(doc.display_size, undefined);
});

test('une valeur deja numerique traverse le crochet sans changer', () => {
  const doc = Telephone.hydrate({ name: 'Essai', brand: 'X', display_size: 6.1 });
  assert.strictEqual(doc.display_size, 6.1);
});
