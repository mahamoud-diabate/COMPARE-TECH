// Tests des règles partagées (shared/). Ces fichiers décident des notes et des
// classements des deux côtés de l'application : une incohérence ici se
// propage partout, d'où des contrôles de structure plutôt que des exemples.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  CRITERES,
  ORIGINES,
  PROTOCOLES,
  SEGMENTS,
  SEUIL_EGALITE,
  equivalents,
  TYPES,
  critere,
  criteresDe,
  plafond,
  resolveType,
  toutesLesCles,
} from '../criteres.js';
import { FORMULES, explainScore } from '../formules.js';
import { CHAMPS_MARCHE } from '../marche.js';

const NATURES = new Set(['benchmark', 'mesure', 'caracteristique']);

test('chaque catégorie a un segment et des critères', () => {
  assert.deepEqual(Object.keys(CRITERES).sort(), [...TYPES].sort());
  for (const type of TYPES) {
    assert.ok(SEGMENTS[type], `${type} : segment manquant`);
    assert.ok(CRITERES[type].length > 0, `${type} : aucun critère`);
  }
});

test('chaque critère est bien formé', () => {
  for (const type of TYPES) {
    const vus = new Set();
    for (const cr of CRITERES[type]) {
      assert.ok(!vus.has(cr.key), `${type} : ${cr.key} déclaré deux fois`);
      vus.add(cr.key);
      assert.ok(NATURES.has(cr.nature), `${type} : ${cr.key} a une nature inconnue`);
      assert.equal(typeof cr.inverse, 'boolean');
      assert.equal(typeof cr.comparable, 'boolean');
      assert.ok(
        cr.plafond === null || cr.plafond > 0,
        `${type} : ${cr.key} a un plafond invalide (${cr.plafond})`
      );
      assert.ok(Object.isFrozen(cr), `${type} : ${cr.key} doit être figé`);
    }
  }
});

test('un critère non comparable ne peut pas avoir de sens de lecture', () => {
  // « Plus petit = meilleur » n'a de sens que si deux valeurs se comparent.
  for (const type of TYPES) {
    for (const cr of CRITERES[type]) {
      if (!cr.comparable) assert.equal(cr.inverse, false, `${type} : ${cr.key}`);
    }
  }
});

test('critere() et plafond() refusent une clé inconnue au lieu de renvoyer undefined', () => {
  assert.throws(() => critere('cpu', 'geekbench_mutli'), /Critère inconnu/);
  assert.throws(() => critere('montre', 'cores'), /Critère inconnu/);
  assert.throws(() => plafond('cpu', 'tdp_w'), /pas de plafond/);
  assert.equal(plafond('cpus', 'geekbench_multi'), 29000);
});

test('resolveType accepte les formes du site et rejette le reste', () => {
  assert.equal(resolveType('cpus'), 'cpu');
  assert.equal(resolveType('telephone'), 'telephone');
  assert.equal(resolveType('laptops'), 'laptop');
  assert.equal(resolveType('montre'), null);
  assert.equal(resolveType(undefined), null);
  assert.deepEqual(criteresDe('montre'), []);
});

test('toutesLesCles liste chaque mesure une seule fois', () => {
  const cles = toutesLesCles();
  assert.equal(new Set(cles).size, cles.length);
  assert.ok(cles.includes('benchmark_3dmark'));
  assert.ok(cles.includes('battery_life_hours'));
});

// --- formules ------------------------------------------------------------

test('chaque formule ne repose que sur des benchmarks déclarés, avec plafond', () => {
  for (const [type, formule] of Object.entries(FORMULES)) {
    for (const terme of formule.termes) {
      const cr = critere(type, terme.key);
      assert.equal(cr.nature, 'benchmark', `${type} : ${terme.key} n'est pas un benchmark`);
      assert.equal(terme.max, cr.plafond, `${type} : ${terme.key} a un plafond recopié`);
    }
  }
});

test('les poids de chaque formule totalisent 100 %', () => {
  for (const [type, formule] of Object.entries(FORMULES)) {
    const total = formule.termes.reduce((somme, t) => somme + t.poids, 0);
    assert.ok(Math.abs(total - 1) < 1e-9, `${type} : poids totaux ${total}`);
  }
});

test('AnTuTu ne compte dans aucune note', () => {
  // Scores non comparables entre Android (Vulkan) et iOS (Metal).
  const cles = Object.values(FORMULES).flatMap(f => f.termes.map(t => t.key));
  assert.ok(!FORMULES.telephone.termes.some(t => t.key === 'antutu_score'));
  assert.ok(!cles.includes('antutu_score'));
});

test('explainScore : une donnée manquante rend la note incalculable, jamais nulle', () => {
  const incomplet = explainScore({ geekbench_multi: 20000 }, 'cpu');
  assert.equal(incomplet.total, 0);
  assert.equal(incomplet.complet, false);

  const plein = explainScore({ geekbench_multi: 29000, geekbench_single: 3500 }, 'cpu');
  assert.equal(plein.total, 100);
  assert.equal(plein.complet, true);
});

// --- marché ---------------------------------------------------------------

test('CHAMPS_MARCHE reprend exactement les critères comparables', () => {
  for (const [type, segment] of Object.entries(SEGMENTS)) {
    const attendus = CRITERES[type].filter(cr => cr.comparable).map(cr => cr.key);
    assert.deepEqual(
      CHAMPS_MARCHE[segment].map(ch => ch.key),
      attendus,
      `${segment} : critères du marché désalignés`
    );
  }
  assert.ok(!CHAMPS_MARCHE.gpus.some(ch => ch.key === 'cores'), 'unités de calcul GPU exclues');
});

test('CHAMPS_MARCHE conserve le sens de lecture de chaque critère', () => {
  for (const [type, segment] of Object.entries(SEGMENTS)) {
    for (const champ of CHAMPS_MARCHE[segment]) {
      assert.equal(champ.inverse, critere(type, champ.key).inverse, `${segment} : ${champ.key}`);
    }
  }
});

test('chaque protocole cité par un critère est déclaré, et seuls les tests en ont', () => {
  for (const type of TYPES) {
    for (const cr of CRITERES[type]) {
      for (const id of cr.protocoles) {
        assert.ok(Object.hasOwn(PROTOCOLES, id), `${type}.${cr.key} : protocole ${id} inconnu`);
      }
      assert.equal(new Set(cr.protocoles).size, cr.protocoles.length, `${type}.${cr.key}`);
      // Une caractéristique de fiche technique ne sort d'aucun test ; un
      // benchmark sans protocole de référence ne dirait pas quel test le note.
      if (cr.nature === 'caracteristique') assert.equal(cr.protocoles.length, 0, cr.key);
      if (cr.nature === 'benchmark') assert.ok(cr.protocoles.length > 0, cr.key);
    }
  }
});

test('un protocole porte sa version majeure dans son identifiant', () => {
  for (const id of Object.keys(PROTOCOLES)) {
    if (/geekbench|antutu/.test(id)) assert.match(id, /-\d+$/, id);
  }
});

test('les origines sont les trois de la proposition', () => {
  assert.deepEqual(Object.keys(ORIGINES), ['constructeur', 'laboratoire', 'agregat']);
});

test('equivalents : moins de 3 % d’écart rapporté à la plus grande valeur', () => {
  assert.equal(SEUIL_EGALITE, 0.03);
  assert.ok(equivalents(20000, 20500), '2,4 %');
  assert.ok(!equivalents(20000, 20700), '3,4 %');
  assert.ok(equivalents(100, 102) && equivalents(102, 100), 'symétrique');
  for (const [a, b] of [
    [0, 0],
    [null, 5],
    [5, undefined],
    [-3, -3],
  ]) {
    assert.ok(!equivalents(a, b), `${a} / ${b} : une valeur absente n’est équivalente à rien`);
  }
});

test('fréquences, cœurs et threads ne départagent pas ; un critère non comparable non plus', () => {
  for (const key of ['cores', 'threads', 'base_freq_ghz', 'max_freq_ghz']) {
    assert.equal(critere('cpu', key).departage, false, key);
    assert.equal(critere('cpu', key).comparable, true, `${key} reste situé dans le marché`);
  }
  for (const type of TYPES) {
    for (const cr of CRITERES[type]) {
      if (!cr.comparable) assert.equal(cr.departage, false, `${type}.${cr.key}`);
      if (cr.nature === 'benchmark') assert.equal(cr.departage, true, `${type}.${cr.key}`);
    }
  }
});
