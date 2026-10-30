// Lien entre les règles partagées (shared/criteres.js) et l'affichage
// (src/utils/specs.js, radarAxes.js). Les intitulés restent propres au
// frontend ; tout le reste — unité, sens, plafond, droit à un gagnant — doit
// venir des critères, sans copie.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CRITERES, TYPES, critere } from '../../shared/criteres.js';
import { SPEC_GROUPS, BENCHMARKS, KEY_METRICS } from '../src/utils/specs.js';
import { RADAR_AXES } from '../src/utils/radarAxes.js';

const lignesChiffrees = type =>
  SPEC_GROUPS[type]
    .flatMap(groupe => groupe.rows)
    .filter(r => CRITERES[type].some(c => c.key === r.key));

test('chaque critère partagé a sa ligne dans le tableau de specs', () => {
  for (const type of TYPES) {
    const affichees = new Set(lignesChiffrees(type).map(r => r.key));
    for (const cr of CRITERES[type]) {
      assert.ok(affichees.has(cr.key), `${type} : ${cr.key} n'est affiché nulle part`);
    }
  }
});

test('les lignes de specs reprennent unité, sens et droit au gagnant du critère', () => {
  for (const type of TYPES) {
    for (const ligne of lignesChiffrees(type)) {
      const cr = critere(type, ligne.key);
      assert.equal(ligne.unit ?? null, cr.unite, `${type} : ${ligne.key} (unité)`);
      assert.equal(Boolean(ligne.numeric), cr.comparable, `${type} : ${ligne.key} (gagnant)`);
      assert.equal(Boolean(ligne.invert), cr.inverse, `${type} : ${ligne.key} (sens)`);
    }
  }
});

test('barres de benchmark et radar utilisent le plafond du critère', () => {
  for (const type of TYPES) {
    for (const barre of BENCHMARKS[type] || []) {
      assert.equal(barre.max, critere(type, barre.key).plafond, `${type} : barre ${barre.key}`);
    }
    for (const axe of RADAR_AXES[type] || []) {
      assert.equal(axe.max, critere(type, axe.field).plafond, `${type} : axe ${axe.field}`);
    }
  }
});

test('les métriques des synthèses reprennent unité et sens du critère', () => {
  for (const type of TYPES) {
    for (const metrique of KEY_METRICS[type] || []) {
      const cr = critere(type, metrique.key);
      assert.equal(metrique.unit ?? null, cr.unite, `${type} : ${metrique.key}`);
      assert.equal(Boolean(metrique.invert), cr.inverse, `${type} : ${metrique.key}`);
    }
  }
});
