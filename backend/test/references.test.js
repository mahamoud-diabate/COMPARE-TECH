'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  SLUG_VALIDE,
  estIdentifiant,
  estSlug,
  estReference,
  separeReferences,
  filtreReferences,
} = require('../references');

test('estIdentifiant valide un ObjectId Mongo', () => {
  assert.equal(estIdentifiant('6a87ae8355c1df6e30f44092'), true);
  assert.equal(estIdentifiant('not-an-id'), false);
  assert.equal(estIdentifiant(''), false);
  assert.equal(estIdentifiant(null), false);
});

test('estSlug valide un slug alphanumérique en minuscules', () => {
  assert.equal(estSlug('amd-ryzen-7-7800x3d'), true);
  assert.equal(estSlug('intel-core-i9-14900k'), true);
  assert.equal(estSlug('6a87ae8355c1df6e30f44092'), false);
  assert.equal(estSlug('-invalid-leading-dash'), false);
  assert.equal(estSlug('INVALID_UPPERCASE'), false);
});

test('estReference accepte soit un ObjectId soit un slug', () => {
  assert.equal(estReference('6a87ae8355c1df6e30f44092'), true);
  assert.equal(estReference('amd-ryzen-7-7800x3d'), true);
  assert.equal(estReference('---invalid'), false);
});

test('separeReferences répartit correctement IDs et slugs', () => {
  const { identifiants, slugs } = separeReferences([
    '6a87ae8355c1df6e30f44092',
    'amd-ryzen-7-7800x3d',
    '---invalid',
    123,
  ]);
  assert.deepEqual(identifiants, ['6a87ae8355c1df6e30f44092']);
  assert.deepEqual(slugs, ['amd-ryzen-7-7800x3d']);
});

test('filtreReferences génère les conditions Mongo appropriées', () => {
  const f1 = filtreReferences(['6a87ae8355c1df6e30f44092']);
  assert.deepEqual(f1, { _id: { $in: ['6a87ae8355c1df6e30f44092'] } });

  const f2 = filtreReferences(['amd-ryzen-7-7800x3d']);
  assert.deepEqual(f2, { slug: { $in: ['amd-ryzen-7-7800x3d'] } });

  const f3 = filtreReferences(['6a87ae8355c1df6e30f44092', 'amd-ryzen-7-7800x3d']);
  assert.deepEqual(f3, {
    $or: [
      { _id: { $in: ['6a87ae8355c1df6e30f44092'] } },
      { slug: { $in: ['amd-ryzen-7-7800x3d'] } },
    ],
  });

  const f4 = filtreReferences(['---bad']);
  assert.equal(f4, null);
});
