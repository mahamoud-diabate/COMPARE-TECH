/*
 * Tests unitaires des utilitaires de la fiche produit (Refonte Pistes A & C).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  genererUsages,
  genererSpecsSynthese,
  genererDatasheet,
} from '../src/utils/ficheProduit.js';

const FAUX_CPU = {
  name: 'AMD Ryzen 7 7800X3D',
  brand: 'AMD',
  cores: 8,
  threads: 16,
  base_freq_ghz: 4.2,
  max_freq_ghz: 5.0,
  tdp_w: 120,
  geekbench_single: 2657,
  geekbench_multi: 15319,
};

const FAUX_GPU = {
  name: 'NVIDIA GeForce RTX 4090',
  brand: 'NVIDIA',
  cores: 16384,
  memory_gb: 24,
  memory_type: 'GDDR6X',
  tdp_w: 450,
  benchmark_3dmark: 36500,
};

const FAUX_LAPTOP = {
  name: 'Surface Laptop 13.8',
  brand: 'Microsoft',
  cpu_name: 'Snapdragon X2 Plus',
  ram_gb: 16,
  display_brightness_nits: 450,
  battery_life_hours: 16.5,
  geekbench_multi: 12850,
};

const FAUX_TEL = {
  name: 'Galaxy S24 Ultra',
  brand: 'Samsung',
  display_size: 6.8,
  ram_gb: 12,
  battery_mah: 5000,
  antutu_score: 1810000,
};

test('genererUsages affiche les notes par usage calculées sur des mesures', () => {
  const usagesCpu = genererUsages(FAUX_CPU, 'cpu');
  assert.deepEqual(
    usagesCpu.map(u => u.id),
    ['creation', 'reactivite']
  );
  // Pas de Cinebench sur la fiche : la note Création n'est pas devinée.
  assert.equal(usagesCpu[0].specVal, 'Non noté');
  assert.match(usagesCpu[0].impact, /Cinebench 2024 \(multi-cœur\) : non relevé/);
  // 2657 / 3418 du barème v1 = 78 %.
  assert.equal(usagesCpu[1].specVal, '78 / 100');
  assert.match(usagesCpu[1].resume, /barème v1/);

  // Sans FPS, pas de note Jeu : un score Time Spy ne suffit pas.
  assert.equal(genererUsages(FAUX_GPU, 'gpu')[0].specVal, 'Non noté');

  const [mobilite, performance] = genererUsages(FAUX_LAPTOP, 'laptop');
  assert.match(mobilite.impact, /16\.5 h/);
  assert.notEqual(performance.specVal, 'Non noté');

  // Un téléphone sans Geekbench n'est pas noté, quelle que soit sa batterie.
  assert.equal(genererUsages(FAUX_TEL, 'telephone')[0].specVal, 'Non noté');
});

test('aucun profil ne cite une spec papier ni ne comble un manque', () => {
  const texte = JSON.stringify(
    genererUsages({ name: 'X', brand: 'Y', cores: 24, max_freq_ghz: 6 }, 'cpu')
  );
  assert.doesNotMatch(texte, /GHz|cœurs physiques|ventirad/);
});

test('genererSpecsSynthese renvoie 4 indicateurs majeurs pour la barre latérale', () => {
  const synthCpu = genererSpecsSynthese(FAUX_CPU, 'cpu');
  assert.equal(synthCpu.length, 4);
  assert.equal(synthCpu[0].label, 'Cœurs / Threads');
  assert.equal(synthCpu[0].val, '8 / 16');

  const synthGpu = genererSpecsSynthese(FAUX_GPU, 'gpu');
  assert.equal(synthGpu.length, 4);
  assert.ok(synthGpu[0].val.includes('24 Go'));
});

test('genererDatasheet découpe les caractéristiques par groupe avec source', () => {
  const datasheet = genererDatasheet(FAUX_CPU, 'cpu');
  assert.ok(datasheet.length >= 2);
  const premierGroupe = datasheet[0];
  assert.ok(premierGroupe.titre);
  assert.ok(premierGroupe.lignes.length > 0);
  const premiereLigne = premierGroupe.lignes[0];
  assert.ok(premiereLigne.nom);
  assert.ok(premiereLigne.val);
});

test('genererDatasheet cite la source relevée, et n’en invente aucune', () => {
  const produit = {
    ...FAUX_CPU,
    provenance: {
      geekbench_multi: {
        url: 'https://nanoreview.net/en/cpu/x',
        releve_le: '2026-10-01',
        extrait: 'Geekbench 6 (Multi-Core) 15000',
        origine: 'agregat',
        protocole: 'geekbench-6',
      },
    },
  };
  const lignes = genererDatasheet(produit, 'cpu').flatMap(g => g.lignes);

  const sourcee = lignes.find(l => l.cle === 'geekbench_multi');
  assert.equal(sourcee.source.site, 'nanoreview.net');
  assert.equal(sourcee.source.protocole, 'Geekbench 6');
  assert.match(sourcee.source.origine, /utilisateurs/);

  // Une valeur sans provenance n'est attribuée à personne : ni à NanoReview,
  // ni au « constructeur officiel ».
  for (const ligne of lignes.filter(l => l.cle !== 'geekbench_multi')) {
    assert.equal(ligne.source, null, ligne.cle);
  }
});

test('l’autonomie n’est dite « mesurée » que si sa source l’établit', () => {
  const portable = {
    name: 'Portable',
    brand: 'X',
    battery_life_hours: 12,
    provenance: {
      battery_life_hours: {
        url: 'https://notebookcheck.net/x',
        releve_le: '2026-10-01',
        extrait: 'WiFi Websurfing 12h 0min',
      },
    },
  };
  const titre = p => genererSpecsSynthese(p, 'laptop')[0].label;

  assert.equal(titre(portable), 'Autonomie');
  const qualifie = origine => ({
    ...portable,
    provenance: {
      battery_life_hours: { ...portable.provenance.battery_life_hours, origine },
    },
  });
  assert.equal(titre(qualifie('laboratoire')), 'Autonomie mesurée');
  assert.equal(titre(qualifie('constructeur')), 'Autonomie annoncée');
});

test('les utilitaires gèrent les types inconnus ou les valeurs manquantes sans planter', () => {
  assert.deepEqual(genererUsages(null, 'cpu'), []);
  assert.deepEqual(genererUsages({}, 'inconnu'), []);
  assert.deepEqual(genererSpecsSynthese(null, 'gpu'), []);
  assert.deepEqual(genererDatasheet(null, 'telephone'), []);
});
