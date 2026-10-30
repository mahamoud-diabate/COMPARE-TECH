/*
 * Tests unitaires des utilitaires de la fiche produit (Refonte Pistes A & C).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { genererUsages, genererSpecsSynthese, genererDatasheet } from '../src/utils/ficheProduit.js';

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

test('genererUsages renvoie 3 usages structurés pour chaque catégorie', () => {
  const usagesCpu = genererUsages(FAUX_CPU, 'cpu');
  assert.equal(usagesCpu.length, 3);
  assert.ok(usagesCpu[0].titre);
  assert.ok(usagesCpu[0].specVal.includes('5 GHz') || usagesCpu[0].specVal.includes('8'));
  assert.ok(usagesCpu[2].impact.includes('ventirad'));

  const usagesGpu = genererUsages(FAUX_GPU, 'gpu');
  assert.equal(usagesGpu.length, 3);
  assert.ok(usagesGpu[0].impact.includes('4K'));

  const usagesLaptop = genererUsages(FAUX_LAPTOP, 'laptop');
  assert.equal(usagesLaptop.length, 3);
  assert.ok(usagesLaptop[0].specVal.includes('16.5'));

  const usagesTel = genererUsages(FAUX_TEL, 'telephone');
  assert.equal(usagesTel.length, 3);
  assert.ok(usagesTel[1].specVal.includes('5000') || usagesTel[1].specVal.includes('5 000'));
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
  assert.ok(premiereLigne.source.site);
});

test('les utilitaires gèrent les types inconnus ou les valeurs manquantes sans planter', () => {
  assert.deepEqual(genererUsages(null, 'cpu'), []);
  assert.deepEqual(genererUsages({}, 'inconnu'), []);
  assert.deepEqual(genererSpecsSynthese(null, 'gpu'), []);
  assert.deepEqual(genererDatasheet(null, 'telephone'), []);
});
