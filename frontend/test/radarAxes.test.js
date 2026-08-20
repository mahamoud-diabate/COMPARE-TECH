// Tests de `src/utils/radarAxes.js` — les axes et leurs notes sur 100.
//
// `buildCategoryScores` est la source unique du bloc « Évaluation » ET du
// radar. Il y avait auparavant une seconde fonction, `buildRadarData`, qui
// normalisait les mêmes champs avec les mêmes plafonds pour un rendu
// différent : deux implémentations d'une même règle finissent toujours par
// diverger, et le radar ne savait tracer que deux produits.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  RADAR_AXES,
  AXIS_HINTS,
  resolveType,
  buildCategoryScores,
} from '../src/utils/radarAxes.js';

const ryzen = {
  name: 'Ryzen',
  geekbench_single: 3500, // plafond
  geekbench_multi: 14500, // ~50 %
  cores: 12,              // 50 % de 24
  threads: 32,            // plafond
  max_freq_ghz: '5.7',
};

const intel = {
  name: 'Intel',
  geekbench_single: 1750, // 50 %
  geekbench_multi: 29000, // plafond
  cores: 24,
  threads: 32,
  max_freq_ghz: '6.0',
};

const apple = {
  name: 'Apple',
  geekbench_single: 2800,
  geekbench_multi: 21750, // 75 %
  cores: 16,
  threads: 16,
  max_freq_ghz: '4.5',
};

const axisNamed = (rows, label) => rows.find(row => row.label === label);

// --- cohérence du catalogue d'axes -----------------------------------------

test('chaque axe déclaré possède une explication', () => {
  // Régression : les clés d'AXIS_HINTS doivent reprendre à l'identique les
  // libellés de RADAR_AXES, accents compris. Une clé sans accent ne
  // correspond à rien et laisse la ligne sans explication, en silence.
  for (const [type, axes] of Object.entries(RADAR_AXES)) {
    for (const axis of axes) {
      assert.ok(
        AXIS_HINTS[axis.label],
        `${type} : aucune explication pour l’axe « ${axis.label} »`
      );
    }
  }
});

test('chaque axe a un plafond de référence strictement positif', () => {
  for (const [type, axes] of Object.entries(RADAR_AXES)) {
    for (const axis of axes) {
      assert.ok(axis.max > 0, `${type} : ${axis.field} sans plafond exploitable`);
    }
  }
});

test('resolveType ramène les formes plurielles à la clé canonique', () => {
  assert.equal(resolveType('gpus'), 'gpu');
  assert.equal(resolveType('montres'), null);
});

// --- normalisation ----------------------------------------------------------

test('buildCategoryScores normalise chaque axe sur 100', () => {
  const rows = buildCategoryScores([ryzen, intel], 'cpu');
  const mono = axisNamed(rows, 'Mono-cœur');

  assert.equal(mono.values[0], 100, 'le plafond vaut 100');
  assert.equal(mono.values[1], 50, 'la moitié du plafond vaut 50');
});

test('buildCategoryScores plafonne une valeur au-delà de la référence', () => {
  const rows = buildCategoryScores([{ geekbench_single: 9000 }], 'cpu');
  assert.equal(axisNamed(rows, 'Mono-cœur').values[0], 100);
});

test('buildCategoryScores lit les valeurs stockées en texte', () => {
  const rows = buildCategoryScores([{ max_freq_ghz: '5,7' }], 'cpu');
  assert.equal(axisNamed(rows, 'Fréquence').values[0], 95, '5,7 sur un plafond de 6 GHz');
});

test('buildCategoryScores retire les axes qu’aucun produit ne renseigne', () => {
  const rows = buildCategoryScores([{ cores: 8 }, { cores: 16 }], 'cpu');
  assert.deepEqual(rows.map(row => row.label), ['Cœurs']);
});

// --- forme du résultat ------------------------------------------------------

test('buildCategoryScores donne une valeur par produit et par critère', () => {
  const rows = buildCategoryScores([ryzen, intel], 'cpu');
  const multi = axisNamed(rows, 'Multi-cœur');

  assert.equal(multi.values.length, 2);
  assert.equal(multi.values[0], 50);
  assert.equal(multi.values[1], 100);
  assert.ok(multi.hint.length > 0, 'l’explication de l’axe accompagne la note');
});

test('buildCategoryScores accepte trois produits', () => {
  // Le radar s'appuie sur cette même sortie : sans support de la troisième
  // série, un comparatif à trois en perdait un en silence.
  const rows = buildCategoryScores([ryzen, intel, apple], 'cpu');

  assert.ok(rows.length > 0);
  assert.ok(rows.every(row => row.values.length === 3));
  assert.equal(axisNamed(rows, 'Multi-cœur').values[2], 75);
});

test('buildCategoryScores conserve null pour une donnée absente', () => {
  // Le tableau des notes distingue « non mesuré » de « zéro » ; c'est le
  // radar qui retombe sur 0, faute de pouvoir fermer un polygone troué.
  const rows = buildCategoryScores([{ cores: 12 }, { cores: 24, threads: 32 }], 'cpu');
  const threads = axisNamed(rows, 'Threads');

  assert.equal(threads.values[0], null);
  assert.equal(threads.values[1], 100);
});

test('buildCategoryScores accepte un produit seul', () => {
  const rows = buildCategoryScores([ryzen], 'cpu');
  assert.ok(rows.length > 0);
  assert.ok(rows.every(row => row.values.length === 1));
});

test('buildCategoryScores renvoie une liste vide sans produit ou sans type', () => {
  assert.deepEqual(buildCategoryScores([], 'cpu'), []);
  assert.deepEqual(buildCategoryScores([null], 'cpu'), []);
  assert.deepEqual(buildCategoryScores([ryzen], 'montre'), []);
});
