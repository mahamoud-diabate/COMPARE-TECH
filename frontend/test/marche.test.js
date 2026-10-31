// Tests de `src/utils/marche.js` — rangs, tracés et sources de la page
// comparative « dans le marché ». Fonctions pures : ni DOM, ni réseau.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  criteresMarche,
  classer,
  texteRang,
  preparerPiste,
  preparerAxeNotes,
  placerEtiquettes,
  decrireSource,
  indexMeneurs,
  verdictParUsage,
  SEUIL_POINTS,
} from '../src/utils/marche.js';

// Mesures multi-cœur réelles des 15 processeurs servis par l'API.
const MULTI = [
  15319, 21401, 19043, 21758, 15478, 13615, 18350, 12701, 22629, 20262, 15949, 20498, 20193, 23095,
  16101,
];
const COEURS = [8, 16, 16, 16, 8, 6, 8, 12, 24, 20, 14, 24, 16, 24, 14];

// --- criteresMarche ---------------------------------------------------------

test('criteresMarche ne garde que les lignes chiffrées, performances en tête', () => {
  const cles = criteresMarche('cpu').map(c => c.key);
  assert.deepEqual(cles.slice(0, 2), ['geekbench_single', 'geekbench_multi']);
  assert.ok(cles.includes('tdp_w'));
  assert.ok(!cles.includes('brand'), 'la marque ne se classe pas');
});

test('criteresMarche exclut les unités de calcul GPU, non comparables entre marques', () => {
  assert.ok(!criteresMarche('gpus').some(c => c.key === 'cores'));
});

test('criteresMarche porte le sens inversé de la consommation', () => {
  const tdp = criteresMarche('cpu').find(c => c.key === 'tdp_w');
  assert.equal(tdp.invert, true);
});

test('criteresMarche renvoie une liste vide pour un type inconnu', () => {
  assert.deepEqual(criteresMarche('montres'), []);
});

// --- classer / texteRang ----------------------------------------------------

test('classer : le 7950X est 4e sur 15 en multi-cœur', () => {
  const c = classer(MULTI, 21401);
  assert.equal(c.rang, 4);
  assert.equal(c.total, 15);
  assert.equal(texteRang(c), '4e sur 15');
  assert.equal(c.mot, 'Au-dessus de la moyenne');
});

test('classer : le premier s’écrit « 1er »', () => {
  assert.equal(texteRang(classer(MULTI, 23095)), '1er sur 15');
});

test('classer : les ex æquo partagent le même rang', () => {
  const a = classer(COEURS, 24);
  assert.equal(a.rang, 1);
  assert.equal(a.exAequo, true);
  assert.equal(texteRang(a), '1er ex æquo sur 15');
  // Devant les 16 cœurs : trois à 24 et un à 20.
  assert.equal(classer(COEURS, 16).rang, 5);
});

test('classer : le dernier est « parmi les plus faibles »', () => {
  assert.equal(classer(MULTI, 12701).mot, 'Parmi les plus faibles');
});

test('classer inverse : la plus basse consommation est 1re', () => {
  const tdp = [65, 105, 120, 170, 253];
  assert.equal(classer(tdp, 65, true).rang, 1);
  assert.equal(classer(tdp, 253, true).rang, 5);
});

test('classer ignore les trous et les zéros de la série', () => {
  const c = classer([100, null, 0, '', 200, undefined], 200);
  assert.equal(c.total, 2);
  assert.equal(c.rang, 1);
});

test('classer ajoute une valeur absente de la série au lieu de fausser le total', () => {
  const c = classer([10, 20, 30], 25);
  assert.equal(c.total, 4);
  assert.equal(c.rang, 2);
});

test('classer renvoie null pour une valeur manquante', () => {
  assert.equal(classer(MULTI, null), null);
  assert.equal(classer(MULTI, 0), null);
});

test('classer passe en « Top X % » au-delà de 100 produits', () => {
  const serie = Array.from({ length: 1000 }, (_, i) => i + 1);
  const c = classer(serie, 995);
  assert.equal(c.top, 1);
  assert.equal(texteRang(c), 'Top 1\u00a0%');
  assert.equal(texteRang(classer(serie, 500)), 'Top 51\u00a0%');
});

test('classer ne donne pas de mot sous trois produits', () => {
  assert.equal(classer([1, 2], 2).mot, null);
});

// --- preparerPiste ----------------------------------------------------------

test('preparerPiste lit les cœurs par paliers réels', () => {
  const p = preparerPiste(COEURS, [8, 16]);
  assert.equal(p.mode, 'paliers');
  assert.deepEqual(
    p.elements.map(e => [e.valeur, e.effectif]),
    [
      [6, 1],
      [8, 3],
      [12, 1],
      [14, 2],
      [16, 4],
      [20, 1],
      [24, 3],
    ]
  );
});

test('preparerPiste affiche un point par produit sur un petit catalogue', () => {
  const p = preparerPiste(MULTI, [15319, 21401]);
  assert.equal(p.mode, 'points');
  assert.equal(p.elements.length, 15);
  assert.equal(p.marques[0].t < p.marques[1].t, true, 'le meilleur est à droite');
});

test('preparerPiste passe aux colonnes au-delà du seuil, avec un nombre fixe d’éléments', () => {
  const grand = Array.from({ length: 10000 }, (_, i) => 1000 + i);
  const p = preparerPiste(grand, [5000]);
  assert.equal(p.mode, 'colonnes');
  assert.equal(p.elements.length, 32);
  assert.ok(grand.length > SEUIL_POINTS);
});

test('preparerPiste signale une valeur hors du cadre borné', () => {
  const grand = Array.from({ length: 1000 }, (_, i) => 100 + i);
  grand.push(99999);
  const p = preparerPiste(grand, [99999]);
  assert.equal(p.marques[0].horsDroite, true);
  assert.equal(p.marques[0].t, 1);
});

test('preparerPiste retourne l’axe pour la consommation : le plus sobre à droite', () => {
  const p = preparerPiste([65, 105, 120, 170, 253], [65, 253], true);
  assert.equal(p.marques[0].t, 1);
  assert.equal(p.marques[1].t, 0);
  assert.equal(p.bornes.droite, 65);
});

test('preparerPiste renvoie null sans aucune mesure, et ignore un produit sans valeur', () => {
  assert.equal(preparerPiste([null, undefined, 0], [null]), null);
  assert.equal(preparerPiste(MULTI, [null, 15319]).marques[0], null);
});

test('preparerPiste empile deux valeurs identiques au lieu de les superposer', () => {
  // 14 valeurs distinctes : au-delà des paliers, donc en points.
  const p = preparerPiste([10, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140], []);
  assert.equal(p.mode, 'points');
  const niveaux = p.elements.filter(e => e.valeur === 10).map(e => e.niveau);
  assert.deepEqual(niveaux, [0, 1]);
});

// --- preparerAxeNotes -------------------------------------------------------

test('preparerAxeNotes donne le milieu des notes réelles', () => {
  const notes = [60, 78, 72, 82, 62, 58, 73, 50, 82, 75, 63, 75, 74, 85, 62];
  const axe = preparerAxeNotes(notes);
  assert.equal(axe.mode, 'points');
  assert.equal(axe.milieu, 73);
});

test('preparerAxeNotes écarte les notes nulles (non calculables)', () => {
  assert.equal(preparerAxeNotes([0, 0]), null);
  assert.equal(preparerAxeNotes([0, 50, 70]).points.length, 2);
});

// --- placerEtiquettes -------------------------------------------------------

test('placerEtiquettes sépare deux étiquettes visant le même point', () => {
  const [a, b] = placerEtiquettes(
    [
      { cible: 400, largeur: 100 },
      { cible: 400, largeur: 100 },
    ],
    0,
    760
  );
  assert.ok(Math.abs(a - b) >= 100, `écart ${Math.abs(a - b)}`);
});

test('placerEtiquettes garde les étiquettes dans le cadre', () => {
  const [a] = placerEtiquettes([{ cible: 2, largeur: 100 }], 6, 754);
  assert.equal(a, 56);
});

// --- decrireSource ----------------------------------------------------------

test('decrireSource rend le site et la date en français', () => {
  const s = decrireSource({
    url: 'https://www.nanoreview.net/en/cpu/amd-ryzen-7-7800x3d',
    releve_le: '2026-08-20T00:00:00.000Z',
    extrait: 'Total Cores 8',
  });
  assert.equal(s.site, 'nanoreview.net');
  assert.equal(s.date, '20 août 2026');
  assert.equal(s.extrait, 'Total Cores 8');
});

test('decrireSource renvoie null sans URL exploitable', () => {
  assert.equal(decrireSource(null), null);
  assert.equal(decrireSource({ url: 'pas une url' }), null);
});

// --- indexMeneurs -----------------------------------------------------------

test('indexMeneurs : la meilleure note, et toute note à moins de 3 %', () => {
  assert.deepEqual(indexMeneurs([88, 81, 57]), [0], '7 points d’écart : un seul en tête');
  assert.deepEqual(indexMeneurs([88, 86, 57]), [0, 1], '2 points sur 88 : équivalents');
  assert.deepEqual(indexMeneurs([55, 55]), [0, 1], 'même note');
  assert.deepEqual(indexMeneurs([0, 0]), [], 'aucun produit noté');
  assert.deepEqual(indexMeneurs([0, 42]), [1], 'un « non noté » n’est jamais en tête');
});

// --- verdictParUsage --------------------------------------------------------

const X1 = {
  name: 'X1 Carbon',
  battery_life_hours: 22.07,
  display_brightness_nits: 623.3,
  geekbench_multi: 11000,
};
const SCAR = {
  name: 'SCAR 18',
  battery_life_hours: 4,
  display_brightness_nits: 604.4,
  geekbench_multi: 22850,
};

test('verdictParUsage : chaque usage a son gagnant quand ils diffèrent', () => {
  const v = verdictParUsage([X1, SCAR], 'laptop');
  assert.match(v, /^Pas de vainqueur unique\./);
  assert.match(v, /X1 Carbon en « Mobilité »/);
  assert.match(v, /SCAR 18 en « Performance » \(100 contre 48\)/);
});

test('verdictParUsage : un seul nom quand il gagne partout', () => {
  const fort = {
    name: 'Fort',
    geekbench_single: 3418,
    geekbench_multi: 23095,
    cinebench_2024_multi: 2320,
  };
  const faible = {
    name: 'Faible',
    geekbench_single: 2000,
    geekbench_multi: 12000,
    cinebench_2024_multi: 1000,
  };
  assert.match(verdictParUsage([faible, fort], 'cpu'), /^Fort l’emporte sur tous les usages notés/);
});

test('verdictParUsage : la zone d’égalité de 3 % s’applique', () => {
  const a = {
    name: 'A',
    geekbench_single: 3400,
    geekbench_multi: 23000,
    cinebench_2024_multi: 2300,
  };
  const b = {
    name: 'B',
    geekbench_single: 3390,
    geekbench_multi: 15000,
    cinebench_2024_multi: 1500,
  };
  const v = verdictParUsage([a, b], 'cpu');
  assert.match(v, /A l’emporte en « Création & calcul lourd »/);
  assert.match(v, /Égalité en « Réactivité au quotidien »/);
});

test('verdictParUsage : null sans usage comparable, la note globale prend le relais', () => {
  assert.equal(verdictParUsage([{ name: 'A' }, { name: 'B' }], 'gpu'), null);
  assert.equal(verdictParUsage([X1], 'laptop'), null);
});
