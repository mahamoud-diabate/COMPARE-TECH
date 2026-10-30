'use strict';

// Tests du résumé statistique (marche.js) : lecture tolérante des mesures,
// quantiles, bascule discret / continu et bornage aux extrêmes.
// Aucune base, aucun réseau : les fonctions testées sont pures.
const { test } = require('node:test');
const assert = require('node:assert');
const {
  CHAMPS_MARCHE,
  NB_BACS,
  MAX_PALIERS,
  SEUIL_BORNAGE,
  nombre,
  quantile,
  statistiques,
  resumeMarche,
} = require('../marche');

test('nombre lit un nombre, une chaîne décimale et une mesure encore en texte', () => {
  assert.strictEqual(nombre(8), 8);
  assert.strictEqual(nombre('5.4'), 5.4);
  assert.strictEqual(nombre('6,8'), 6.8);
  assert.strictEqual(nombre('6.8 pouces'), 6.8);
  assert.strictEqual(nombre('  12 701 points '), 12701);
});

test('nombre renvoie null plutot qu un zero pour une mesure absente', () => {
  // Un zero par defaut placerait la fiche derniere du marche au lieu de la
  // retirer du calcul : c'est exactement le bug que ce module doit eviter.
  assert.strictEqual(nombre(null), null);
  assert.strictEqual(nombre(undefined), null);
  assert.strictEqual(nombre(''), null);
  assert.strictEqual(nombre('n.d.'), null);
  assert.strictEqual(nombre(NaN), null);
  assert.strictEqual(nombre(Infinity), null);
});

test('nombre conserve un vrai zero', () => {
  assert.strictEqual(nombre(0), 0);
});

test('quantile interpole entre deux valeurs voisines', () => {
  const trie = [1, 2, 3, 4];
  assert.strictEqual(quantile(trie, 0), 1);
  assert.strictEqual(quantile(trie, 1), 4);
  assert.strictEqual(quantile(trie, 0.5), 2.5);
});

test('quantile renvoie null sur une serie vide', () => {
  assert.strictEqual(quantile([], 0.5), null);
});

test('statistiques signale une critere sans aucune mesure', () => {
  const resume = statistiques([null, undefined, ''], { total: 15 });
  assert.strictEqual(resume.nature, 'vide');
  assert.strictEqual(resume.mesures, 0);
  assert.strictEqual(resume.total, 15);
  assert.strictEqual(resume.manquantes, 15);
  assert.deepStrictEqual(resume.paliers, []);
  assert.deepStrictEqual(resume.bacs, []);
});

test('statistiques compte les fiches non renseignees sans les traiter comme zero', () => {
  const resume = statistiques([10, null, 30], { total: 8 });
  assert.strictEqual(resume.mesures, 2);
  assert.strictEqual(resume.manquantes, 6);
  assert.strictEqual(resume.min, 10);
  assert.strictEqual(resume.max, 30);
});

test('statistiques traite les petits effectifs de valeurs distinctes par paliers', () => {
  const resume = statistiques([6, 6, 8, 8, 8, 12], { total: 6 });
  assert.strictEqual(resume.nature, 'discret');
  assert.deepStrictEqual(resume.paliers, [
    { valeur: 6, effectif: 2 },
    { valeur: 8, effectif: 3 },
    { valeur: 12, effectif: 1 },
  ]);
  assert.deepStrictEqual(resume.bacs, []);
});

test('statistiques bascule en continu au dela du nombre de paliers admis', () => {
  const valeurs = Array.from({ length: MAX_PALIERS + 1 }, (_, i) => i + 1);
  const resume = statistiques(valeurs, { total: valeurs.length });
  assert.strictEqual(resume.nature, 'continu');
  assert.strictEqual(resume.bacs.length, NB_BACS);
});

test('statistiques ne borne pas une petite serie continue', () => {
  const resume = statistiques([100, 120, 140, 160], { total: 4 });
  assert.strictEqual(resume.borne, false);
  assert.deepStrictEqual(resume.domaine, [100, 160]);
  assert.strictEqual(resume.horsDomaine, 0);
});

test('statistiques borne un grand catalogue et compte les valeurs hors cadre', () => {
  // Un catalogue reel : 118 valeurs ordinaires et deux extremes (un serveur a
  // tres haut score, un vieux processeur tres bas).
  const valeurs = [];
  for (let i = 0; i < 118; i++) valeurs.push(2000 + i * 10);
  valeurs.push(90000, 30);

  const resume = statistiques(valeurs, { total: valeurs.length });

  assert.strictEqual(resume.borne, true);
  assert.ok(resume.domaine[0] > resume.min, 'la borne basse doit ecarter les extremes');
  assert.ok(resume.domaine[1] < resume.max, 'la borne haute doit ecarter les extremes');

  // Aucune mesure ne disparait : celles du domaine sont reparties dans les
  // bacs, les autres sont comptees explicitement.
  const totalBacs = resume.bacs.reduce((somme, n) => somme + n, 0);
  assert.strictEqual(totalBacs + resume.horsDomaine, resume.mesures);
  assert.ok(resume.horsDomaine >= 2);
});

test('statistiques reste coherent sur une seule mesure', () => {
  const resume = statistiques([42], { total: 1 });
  assert.strictEqual(resume.mesures, 1);
  assert.strictEqual(resume.p50, 42);
  assert.strictEqual(resume.min, resume.max);
  assert.strictEqual(resume.borne, false);
});

test('statistiques calcule les quantiles attendus sur une serie connue', () => {
  const valeurs = Array.from({ length: 101 }, (_, i) => i); // 0..100
  const resume = statistiques(valeurs, { total: valeurs.length });
  assert.strictEqual(resume.p50, 50);
  assert.strictEqual(resume.p25, 25);
  assert.strictEqual(resume.p75, 75);
  // La serie depasse 40 mesures : les bornes suivent P2 et P98.
  assert.ok(Math.abs(resume.domaine[0] - 2) < 0.5);
  assert.ok(Math.abs(resume.domaine[1] - 98) < 0.5);
});

test('resumeMarche expose un critere par champ, avec unite et sens de lecture', () => {
  const documents = [
    { geekbench_multi: 15319, tdp_w: null },
    { geekbench_multi: 21401, tdp_w: 170 },
    { geekbench_multi: 19043, tdp_w: 120 },
  ];
  const resume = resumeMarche(documents, CHAMPS_MARCHE.cpus, 15);

  assert.strictEqual(resume.total, 15);
  assert.deepStrictEqual(
    Object.keys(resume.criteres),
    CHAMPS_MARCHE.cpus.map(c => c.key)
  );
  assert.strictEqual(resume.criteres.geekbench_multi.mesures, 3);
  assert.strictEqual(resume.criteres.geekbench_multi.manquantes, 12);
  assert.strictEqual(resume.criteres.geekbench_multi.unite, 'points');
  assert.strictEqual(resume.criteres.geekbench_multi.inverse, false);
  assert.strictEqual(resume.criteres.tdp_w.inverse, true);
  assert.strictEqual(resume.criteres.tdp_w.mesures, 2);
});

test('resumeMarche tolere une collection vide', () => {
  const resume = resumeMarche([], CHAMPS_MARCHE.cpus, 0);
  assert.strictEqual(resume.total, 0);
  assert.strictEqual(resume.criteres.geekbench_multi.nature, 'vide');
});

test('resumeMarche n utilise pas les unites de calcul des GPU', () => {
  // Un coeur CUDA et un stream processor ne se comparent pas : le critere
  // `cores` ne doit jamais apparaitre dans l axe des GPU.
  const cles = CHAMPS_MARCHE.gpus.map(c => c.key);
  assert.ok(!cles.includes('cores'));
});

test('seuil de bornage et nombre de bacs restent coherents entre eux', () => {
  assert.ok(SEUIL_BORNAGE > MAX_PALIERS);
  assert.ok(NB_BACS >= 16);
});
