// Tests des notes par usage (shared/usages.js) : structure des profils et
// règles de calcul décidées le 31 octobre 2026.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CRITERES, TYPES, critere } from '../criteres.js';
import { BAREME, PROFILS, mesureUtilisable, noteProfil, notesParUsage } from '../usages.js';

test('chaque profil ne repose que sur des mesures, avec un poids total de 100 %', () => {
  for (const type of TYPES) {
    for (const profil of PROFILS[type]) {
      const total = profil.termes.reduce((s, t) => s + t.poids, 0);
      assert.ok(Math.abs(total - 1) < 1e-9, `${type}.${profil.id} : poids ${total}`);
      for (const { key } of profil.termes) {
        const cr = critere(type, key);
        // Une spec papier (cœurs, GHz, mAh, TDP) n'entre dans aucun profil.
        assert.notEqual(cr.nature, 'caracteristique', `${type}.${profil.id} : ${key}`);
        assert.ok(cr.departage, `${type}.${profil.id} : ${key} ne départage pas`);
        assert.ok(BAREME.references[type][key] > 0, `${type}.${key} : pas de référence au barème`);
      }
    }
  }
});

test('chaque référence du barème désigne un critère existant', () => {
  for (const [type, refs] of Object.entries(BAREME.references)) {
    for (const key of Object.keys(refs)) {
      assert.ok(
        CRITERES[type].some(cr => cr.key === key),
        `${type}.${key} absent de criteres.js`
      );
    }
  }
});

test('la valeur de référence vaut 100, une mesure manquante rend le profil non noté', () => {
  const [reactivite] = PROFILS.cpu.filter(pr => pr.id === 'reactivite');
  assert.equal(noteProfil({ geekbench_single: 3418 }, 'cpu', reactivite).note, 100);
  assert.equal(noteProfil({ geekbench_single: 1709 }, 'cpu', reactivite).note, 50);

  const sansMesure = noteProfil({ cores: 16 }, 'cpu', reactivite);
  assert.equal(sansMesure.note, null, 'jamais 0');
  assert.deepEqual(sansMesure.manquants, ['geekbench_single']);
});

test('un produit au-delà du barème dépasse 100, au lieu d’être bloqué', () => {
  const [reactivite] = PROFILS.cpu.filter(pr => pr.id === 'reactivite');
  assert.equal(noteProfil({ geekbench_single: 3760 }, 'cpu', reactivite).note, 110);
});

test('moyenne géométrique : une faiblesse n’est pas masquée par un point fort', () => {
  const [creation] = PROFILS.cpu.filter(pr => pr.id === 'creation');
  // 100 % sur Cinebench, 25 % sur Geekbench : moyenne simple 62,5, géométrique 50.
  const n = noteProfil({ cinebench_2024_multi: 2320, geekbench_multi: 23095 / 4 }, 'cpu', creation);
  assert.equal(n.note, 50);
});

test('une mesure relevée avec un autre test que la référence n’est pas utilisée', () => {
  const source = protocole => ({
    url: 'https://exemple.org',
    releve_le: '2026-10-31',
    extrait: 'x',
    protocole,
  });
  const avec = protocole => ({
    geekbench_single: 3000,
    provenance: { geekbench_single: source(protocole) },
  });

  assert.equal(mesureUtilisable(avec('geekbench-6'), 'cpu', 'geekbench_single'), 3000);
  assert.equal(
    mesureUtilisable(avec(undefined), 'cpu', 'geekbench_single'),
    3000,
    'test non précisé'
  );
  assert.equal(mesureUtilisable(avec('geekbench-5'), 'cpu', 'geekbench_single'), null);
});

test('notesParUsage suit les profils de la catégorie, et rien pour un type inconnu', () => {
  const notes = notesParUsage({ fps_1080p: 217, fps_1440p: 177, fps_4k: 106 }, 'gpus');
  assert.deepEqual(
    notes.map(n => [n.id, n.note]),
    [['jeu', 100]]
  );
  assert.match(notes[0].bareme, /barème v1/);
  assert.deepEqual(notesParUsage({}, 'montre'), []);
});
