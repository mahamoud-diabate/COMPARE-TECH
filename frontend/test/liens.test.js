// Tests de `src/utils/liens.js` — la fabrication des adresses de fiche.
// L'enjeu n'est pas cosmétique : un lien qui repose sur l'identifiant Mongo
// meurt au premier réimport de la collection, alors qu'un lien en slug survit.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { cheminProduit } from '../src/utils/liens.js';

test('cheminProduit préfère le slug quand le produit en a un', () => {
  const produit = { _id: '691ba31fd93e1b9f35553e82', slug: 'amd-ryzen-7-7800x3d' };
  assert.equal(cheminProduit('cpu', produit), '/cpu/amd-ryzen-7-7800x3d');
});

test('cheminProduit retombe sur l’identifiant pour un document sans slug', () => {
  // Les documents importés avant l'ajout du champ n'en ont pas : sans ce
  // repli, toutes leurs fiches deviendraient inatteignables d'un coup.
  const produit = { _id: '691ba31fd93e1b9f35553e82' };
  assert.equal(cheminProduit('gpu', produit), '/gpu/691ba31fd93e1b9f35553e82');
});

test('cheminProduit ignore un slug vide plutôt que de le laisser passer', () => {
  const produit = { _id: '691ba31fd93e1b9f35553e82', slug: '' };
  assert.equal(cheminProduit('laptop', produit), '/laptop/691ba31fd93e1b9f35553e82');
});

test('cheminProduit place le type en tête du chemin', () => {
  const produit = { slug: 'galaxy-s24-ultra' };
  assert.equal(cheminProduit('telephone', produit), '/telephone/galaxy-s24-ultra');
});
