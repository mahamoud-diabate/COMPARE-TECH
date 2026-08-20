// Tests de `src/utils/scores.js` — la note sur 100 affichée partout dans le
// site. C'est le chiffre le plus visible du comparateur : une dérive ici
// change silencieusement tous les classements.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateCpuScore,
  calculateGpuScore,
  calculateLaptopScore,
  calculateTelephoneScore,
  getProductScore,
  getScoreColor,
  scoreVar,
  scoreGrade,
} from '../src/utils/scores.js';

// --- pondération du score CPU ----------------------------------------------

test('le score CPU pèse 70 % multi-cœur et 30 % mono-cœur', () => {
  // Plafonds de référence : 29000 en multi, 3500 en mono.
  const parfait = calculateCpuScore({ geekbench_multi: 29000, geekbench_single: 3500 });
  assert.equal(parfait, 100);

  // Uniquement le plafond multi : 100 × 0,7
  const multiSeul = calculateCpuScore({ geekbench_multi: 29000, geekbench_single: 1 });
  assert.ok(multiSeul >= 70 && multiSeul <= 71, `attendu ~70, obtenu ${multiSeul}`);
});

test('le score CPU vaut 0 si un des deux benchmarks manque', () => {
  assert.equal(calculateCpuScore({ geekbench_multi: 20000 }), 0);
  assert.equal(calculateCpuScore({ geekbench_single: 3000 }), 0);
  assert.equal(calculateCpuScore({}), 0);
});

// --- plafonnement -----------------------------------------------------------

test('aucun score ne dépasse 100, même au-delà du plafond de référence', () => {
  assert.equal(calculateCpuScore({ geekbench_multi: 99000, geekbench_single: 9000 }), 100);
  assert.equal(calculateGpuScore({ benchmark_3dmark: 99000 }), 100);
  assert.equal(calculateLaptopScore({ geekbench_multi: 99000 }), 100);
  assert.equal(calculateTelephoneScore({ antutu_score: 9000000 }), 100);
});

test('un benchmark absent donne 0 et non NaN', () => {
  assert.equal(calculateGpuScore({}), 0);
  assert.equal(calculateLaptopScore({}), 0);
  assert.equal(calculateTelephoneScore({}), 0);
});

// --- aiguillage -------------------------------------------------------------

test('getProductScore choisit la formule d’après le type', () => {
  const gpu = { benchmark_3dmark: 17500 };
  assert.equal(getProductScore(gpu, 'gpu'), 50);
  assert.equal(getProductScore(gpu, 'gpus'), 50, 'la forme plurielle doit fonctionner');
});

test('getProductScore lit le type porté par le produit à défaut d’argument', () => {
  const phone = { antutu_score: 1600000, productType: 'telephone' };
  assert.equal(getProductScore(phone), 50);
});

test('getProductScore préfère un score déjà enregistré sur le produit', () => {
  // Permet d'imposer une note éditoriale sans toucher aux formules.
  const cpu = { score: 42, geekbench_multi: 29000, geekbench_single: 3500 };
  assert.equal(getProductScore(cpu, 'cpu'), 42);
});

test('getProductScore renvoie 0 pour un type inconnu', () => {
  assert.equal(getProductScore({ geekbench_multi: 29000 }, 'montre'), 0);
});

// --- échelle de couleur -----------------------------------------------------

test('scoreGrade suit les seuils 90 / 70 / 50 / 30', () => {
  const letter = value => scoreGrade(value).letter;

  assert.equal(letter(100), 'A+');
  assert.equal(letter(90), 'A+');
  assert.equal(letter(89), 'A');
  assert.equal(letter(70), 'A');
  assert.equal(letter(69), 'B');
  assert.equal(letter(50), 'B');
  assert.equal(letter(49), 'C');
  assert.equal(letter(30), 'C');
  assert.equal(letter(29), 'D');
  assert.equal(letter(1), 'D');
});

test('scoreGrade associe une couleur distincte à chaque palier', () => {
  const couleurs = [100, 80, 60, 40, 10].map(v => scoreGrade(v).variable);
  assert.equal(new Set(couleurs).size, 5, 'cinq paliers, cinq couleurs');
  assert.ok(couleurs.every(c => c.startsWith('var(--nr-g-')));
});

test('scoreGrade distingue « pas de note » de « mauvaise note »', () => {
  // Un produit sans benchmark ne doit pas s'afficher en rouge avec un D : il
  // n'est pas mauvais, il est non mesuré. D'où l'absence de lettre.
  for (const value of [0, undefined, null]) {
    assert.equal(scoreGrade(value).letter, null, `valeur : ${String(value)}`);
    assert.equal(scoreGrade(value).variable, 'var(--nr-g-none)');
  }
});

test('scoreVar reste un raccourci vers la couleur du grade', () => {
  assert.equal(scoreVar(95), scoreGrade(95).variable);
  assert.equal(scoreVar(0), 'var(--nr-g-none)');
});

test('getScoreColor reste disponible pour les appelants historiques', () => {
  assert.equal(getScoreColor(0), 'secondary');
  assert.equal(getScoreColor(95), 'success');
  assert.equal(getScoreColor(40), 'danger');
});
