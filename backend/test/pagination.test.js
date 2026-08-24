'use strict';

// Tests de `pagination.js` — la lecture des parametres `limit` et `page`.
//
// Ces valeurs viennent de l'URL, donc de l'exterieur : ce sont des chaines
// libres qui finissent en `skip`/`limit` Mongo. Les tests fixent ce qui passe
// et ce qui est refuse avant d'atteindre la base.
const { test } = require('node:test');
const assert = require('node:assert');

const { lecturePaginee, LIMITE_MAX } = require('../pagination');

test('sans parametre, la collection entiere est demandee', () => {
  assert.deepStrictEqual(lecturePaginee({}), { limit: 0, skip: 0 });
  assert.deepStrictEqual(lecturePaginee(), { limit: 0, skip: 0 });
});

test('limit seule part de la premiere page', () => {
  assert.deepStrictEqual(lecturePaginee({ limit: '50' }), { limit: 50, skip: 0 });
});

test('page seule prend la limite par defaut', () => {
  assert.deepStrictEqual(lecturePaginee({ page: '3' }), {
    limit: LIMITE_MAX,
    skip: 2 * LIMITE_MAX,
  });
});

test('le saut se calcule depuis la page demandee', () => {
  assert.deepStrictEqual(lecturePaginee({ limit: '25', page: '4' }), { limit: 25, skip: 75 });
});

test('une limite au-dela du plafond est refusee', () => {
  const resultat = lecturePaginee({ limit: String(LIMITE_MAX + 1) });
  assert.ok(resultat.erreur, 'une limite hors plafond doit etre refusee');
  assert.strictEqual(resultat.limit, undefined);
});

test('la limite exactement au plafond passe', () => {
  assert.deepStrictEqual(lecturePaginee({ limit: String(LIMITE_MAX) }), {
    limit: LIMITE_MAX,
    skip: 0,
  });
});

test('une limite nulle ou negative est refusee', () => {
  assert.ok(lecturePaginee({ limit: '0' }).erreur);
  assert.ok(lecturePaginee({ limit: '-5' }).erreur);
});

test('une page nulle ou negative est refusee', () => {
  assert.ok(lecturePaginee({ page: '0' }).erreur);
  assert.ok(lecturePaginee({ page: '-2' }).erreur);
});

test('une valeur non entiere est refusee plutot qu arrondie', () => {
  assert.ok(lecturePaginee({ limit: '12.5' }).erreur);
  assert.ok(lecturePaginee({ page: '1.9' }).erreur);
});

test('une valeur non numerique est refusee', () => {
  assert.ok(lecturePaginee({ limit: 'beaucoup' }).erreur);
  assert.ok(lecturePaginee({ page: 'suivante' }).erreur);
});

// Express rend `?limit=1&limit=2` sous forme de tableau, et un objet si la
// requete porte `?limit[$gt]=1`. Ni l'un ni l'autre ne doit passer pour un
// entier : c'est le meme reflexe que le filtrage des operateurs Mongo.
test('un parametre repete ou structure est refuse', () => {
  assert.ok(lecturePaginee({ limit: ['1', '2'] }).erreur);
  assert.ok(lecturePaginee({ limit: { $gt: 1 } }).erreur);
});

test('une chaine vide est refusee', () => {
  assert.ok(lecturePaginee({ limit: '' }).erreur);
});
