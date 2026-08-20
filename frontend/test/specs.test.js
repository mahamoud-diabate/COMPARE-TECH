// Tests de `src/utils/specs.js` — le catalogue des caractéristiques et les
// règles de comparaison. Aucun rendu, aucun DOM : ce sont des fonctions pures,
// c'est aussi pour cela qu'elles vivent hors des composants.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  SPEC_GROUPS,
  BENCHMARKS,
  KEY_METRICS,
  resolveType,
  toNumber,
  formatValue,
  winnerIndex,
  buildKeyDifferences,
  buildStrengths,
} from '../src/utils/specs.js';

// --- resolveType ------------------------------------------------------------

test('resolveType ramène les formes plurielles à la clé canonique', () => {
  assert.equal(resolveType('cpus'), 'cpu');
  assert.equal(resolveType('telephones'), 'telephone');
  assert.equal(resolveType('laptop'), 'laptop');
});

test('resolveType renvoie null pour un type inconnu ou absent', () => {
  assert.equal(resolveType('montres'), null);
  assert.equal(resolveType(undefined), null);
  assert.equal(resolveType(''), null);
});

// --- toNumber ---------------------------------------------------------------

test('toNumber extrait la valeur des champs stockés en texte', () => {
  assert.equal(toNumber(16), 16);
  assert.equal(toNumber('5.7'), 5.7);
  assert.equal(toNumber('6,7 pouces'), 6.7, 'la virgule décimale française doit être acceptée');
  assert.equal(toNumber('5.2 GHz'), 5.2);
});

test('toNumber renvoie null plutôt que 0 quand la donnée est absente', () => {
  // Un 0 par défaut ferait passer une donnée manquante pour une faiblesse
  // mesurée : c'est toute la raison d'être de ce null.
  for (const value of [null, undefined, '', 'N/A', {}, NaN]) {
    assert.equal(toNumber(value), null, `valeur testée : ${String(value)}`);
  }
});

// --- formatValue ------------------------------------------------------------

test('formatValue sépare les milliers au-delà de 9999', () => {
  assert.equal(formatValue(9999), '9999');

  const large = formatValue(23000);
  assert.equal(large.replace(/\D/g, ''), '23000');
  assert.notEqual(large, '23000', 'un séparateur de milliers est attendu');
});

test('formatValue ajoute l’unité sans jamais la dupliquer', () => {
  assert.equal(formatValue(12, 'Go'), '12 Go');
  assert.equal(formatValue('6.8 pouces', 'pouces'), '6.8 pouces');
  assert.equal(formatValue('5.7', 'GHz'), '5.7 GHz');
});

test('formatValue renvoie null pour une valeur vide', () => {
  assert.equal(formatValue(null), null);
  assert.equal(formatValue(undefined, 'Go'), null);
  assert.equal(formatValue(''), null);
});

// --- winnerIndex ------------------------------------------------------------

const cpus = [
  { cores: 16, tdp: 170 },
  { cores: 24, tdp: 125 },
];

test('winnerIndex désigne la plus grande valeur', () => {
  assert.equal(winnerIndex(cpus, 'cores'), 1);
});

test('winnerIndex inversé désigne la plus petite valeur', () => {
  assert.equal(winnerIndex(cpus, 'tdp', true), 1);
});

test('winnerIndex ne désigne personne à égalité', () => {
  // Surligner une égalité laisserait croire à un avantage.
  assert.equal(winnerIndex([{ ram_gb: 16 }, { ram_gb: 16 }], 'ram_gb'), -1);
});

test('winnerIndex ne désigne personne s’il manque un point de comparaison', () => {
  assert.equal(winnerIndex([{ cores: 8 }], 'cores'), -1, 'un seul produit');
  assert.equal(winnerIndex([{ cores: 8 }, {}], 'cores'), -1, 'valeur absente en face');
  assert.equal(winnerIndex([{}, {}], 'cores'), -1, 'aucune valeur');
});

test('winnerIndex ignore les valeurs nulles ou absentes des autres produits', () => {
  const list = [{ score: 0 }, { score: 120 }, { score: 90 }];
  assert.equal(winnerIndex(list, 'score'), 1);
});

// --- buildKeyDifferences ----------------------------------------------------

const ryzen = { name: 'Ryzen', geekbench_multi: 23000, geekbench_single: 3400, cores: 16 };
const intel = { name: 'Intel', geekbench_multi: 21000, geekbench_single: 3100, cores: 24 };

test('buildKeyDifferences range chaque écart du côté du gagnant', () => {
  const diff = buildKeyDifferences(ryzen, intel, 'cpu');

  assert.ok(diff.a.some(line => line.includes('multi-cœur')), 'le multi-cœur revient au premier');
  assert.ok(diff.b.some(line => line.includes('de cœurs')), 'le nombre de cœurs revient au second');
  assert.ok(diff.a.every(line => !line.includes('de cœurs')));
});

test('buildKeyDifferences chiffre l’écart et rappelle les deux valeurs', () => {
  const diff = buildKeyDifferences(ryzen, intel, 'cpu');
  const cores = diff.b.find(line => line.includes('de cœurs'));

  // 24 contre 16 : +50 %, et les deux valeurs brutes doivent rester lisibles
  // pour que le lecteur puisse vérifier le pourcentage annoncé.
  assert.match(cores, /^50 %/);
  assert.ok(cores.includes('24') && cores.includes('16'));
});

test('buildKeyDifferences écarte les différences inférieures à 3 %', () => {
  const a = { name: 'A', geekbench_multi: 20000 };
  const b = { name: 'B', geekbench_multi: 20200 }; // +1 %
  const diff = buildKeyDifferences(a, b, 'cpu');

  assert.deepEqual(diff, { a: [], b: [] });
});

test('buildKeyDifferences ignore les critères non renseignés', () => {
  const a = { name: 'A', geekbench_multi: 20000 };
  const b = { name: 'B', geekbench_multi: 30000, cores: 12 };
  const diff = buildKeyDifferences(a, b, 'cpu');

  assert.equal(diff.a.length, 0);
  assert.equal(diff.b.length, 1, 'seul le critère présent des deux côtés est retenu');
});

test('buildKeyDifferences renvoie deux listes vides sans produit ou sans type', () => {
  assert.deepEqual(buildKeyDifferences(ryzen, null, 'cpu'), { a: [], b: [] });
  assert.deepEqual(buildKeyDifferences(ryzen, intel, 'montre'), { a: [], b: [] });
});

// --- cohérence du catalogue -------------------------------------------------

test('chaque type déclare des specs, des benchmarks et des critères clés', () => {
  for (const type of Object.keys(SPEC_GROUPS)) {
    assert.ok(SPEC_GROUPS[type].length > 0, `${type} : groupes de specs`);
    assert.ok(BENCHMARKS[type]?.length > 0, `${type} : benchmarks`);
    assert.ok(KEY_METRICS[type]?.length > 0, `${type} : critères clés`);
  }
});

test('tout benchmark tracé correspond à une ligne du tableau de specs', () => {
  // Sinon une mesure apparaîtrait en barre sans jamais figurer dans la fiche
  // technique — et l'administrateur, dont le formulaire est dérivé de
  // SPEC_GROUPS, n'aurait aucun moyen de la saisir.
  for (const [type, benchmarks] of Object.entries(BENCHMARKS)) {
    const keys = new Set(SPEC_GROUPS[type].flatMap(group => group.rows).map(row => row.key));
    for (const bench of benchmarks) {
      assert.ok(keys.has(bench.key), `${type} : ${bench.key} absent de SPEC_GROUPS`);
    }
  }
});

test('tout critère clé correspond à une ligne du tableau de specs', () => {
  for (const [type, metrics] of Object.entries(KEY_METRICS)) {
    const keys = new Set(SPEC_GROUPS[type].flatMap(group => group.rows).map(row => row.key));
    for (const metric of metrics) {
      assert.ok(keys.has(metric.key), `${type} : ${metric.key} absent de SPEC_GROUPS`);
    }
  }
});

test('chaque benchmark a un plafond de référence strictement positif', () => {
  for (const [type, benchmarks] of Object.entries(BENCHMARKS)) {
    for (const bench of benchmarks) {
      assert.ok(bench.max > 0, `${type} : ${bench.key} sans plafond exploitable`);
    }
  }
});

// --- buildStrengths (comparatifs à trois ou plus) ---------------------------

test('buildStrengths ne retient que les critères où le produit devance tous les autres', () => {
  const a = { name: 'A', geekbench_multi: 30000, cores: 8 };
  const b = { name: 'B', geekbench_multi: 20000, cores: 16 };
  const c = { name: 'C', geekbench_multi: 10000, cores: 12 };

  const [sa, sb, sc] = buildStrengths([a, b, c], 'cpu');

  assert.ok(sa.some(line => line.includes('multi-cœur')), 'A mène en multi-cœur');
  assert.ok(sa.every(line => !line.includes('de cœurs')), 'A ne mène pas sur les cœurs');
  assert.ok(sb.some(line => line.includes('de cœurs')), 'B mène sur les cœurs');
  assert.deepEqual(sc, [], 'C ne mène sur rien');
});

test('buildStrengths mesure l’écart avec le meilleur rival, pas avec le dernier', () => {
  const a = { name: 'A', geekbench_multi: 30000 };
  const b = { name: 'B', geekbench_multi: 20000 };
  const c = { name: 'C', geekbench_multi: 1000 };

  const [sa] = buildStrengths([a, b, c], 'cpu');

  // 30000 contre 20000 = +50 %, et non contre 1000.
  assert.match(sa[0], /^50 %/);
});

test('buildStrengths écarte les avances inférieures à 3 %', () => {
  const a = { name: 'A', geekbench_multi: 20200 };
  const b = { name: 'B', geekbench_multi: 20000 };
  const c = { name: 'C', geekbench_multi: 19000 };

  assert.deepEqual(buildStrengths([a, b, c], 'cpu')[0], []);
});

test('buildStrengths renvoie une liste vide sans type ou sans rival', () => {
  assert.deepEqual(buildStrengths([{ cores: 8 }], 'cpu'), []);
  assert.deepEqual(buildStrengths([{ cores: 8 }, { cores: 16 }], 'montre'), []);
});
