'use strict';

// Lien entre les règles partagées (shared/criteres.js) et ce qui est réellement
// stocké (models/*.js). Un critère déclaré sans champ en base produirait une
// colonne toujours vide ; un champ en base oublié dans les critères ne serait
// ni affiché, ni classé, ni transmis à l'IA. Les deux se vérifient ici, sans
// connexion MongoDB : seuls les schémas sont lus.
const { test } = require('node:test');
const assert = require('node:assert');

const { CRITERES } = require('../../shared/criteres.js');
const MODELES = {
  cpu: require('../models/Cpu'),
  gpu: require('../models/Gpu'),
  laptop: require('../models/Laptop'),
  telephone: require('../models/Telephone'),
};

const champsNumeriques = Model =>
  Object.entries(Model.schema.paths)
    .filter(([nom, chemin]) => chemin.instance === 'Number' && nom !== '__v')
    .map(([nom]) => nom);

test('chaque critère partagé existe en base, en tant que nombre', () => {
  for (const [type, Model] of Object.entries(MODELES)) {
    const numeriques = new Set(champsNumeriques(Model));
    for (const cr of CRITERES[type]) {
      assert.ok(
        numeriques.has(cr.key),
        `${type} : ${cr.key} est déclaré dans shared/criteres.js mais absent du modèle`
      );
    }
  }
});

test('chaque champ numérique du modèle est déclaré comme critère', () => {
  for (const [type, Model] of Object.entries(MODELES)) {
    const declares = new Set(CRITERES[type].map(cr => cr.key));
    for (const champ of champsNumeriques(Model)) {
      assert.ok(
        declares.has(champ),
        `${type} : ${champ} existe en base mais pas dans shared/criteres.js`
      );
    }
  }
});

test('marche.js du backend expose bien le résumé partagé', () => {
  const backend = require('../marche');
  const partage = require('../../shared/marche.js');
  assert.strictEqual(backend.resumeMarche, partage.resumeMarche);
  assert.strictEqual(backend.CHAMPS_MARCHE, partage.CHAMPS_MARCHE);
});
