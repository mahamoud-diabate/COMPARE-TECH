// Tests de shared/provenance.js. Les cas de détail (graphies des nombres,
// durées « 19h 19min ») sont couverts par backend/test/import.test.js, qui
// passe par les mêmes fonctions ; ici, le contrat de `controleProvenance`.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { controleProvenance, controleQualification, valeurPresente } from '../provenance.js';
import { criteresDe } from '../criteres.js';

const source = extrait => ({ url: 'https://exemple.org/p', releve_le: '2026-10-30', extrait });

test('une mesure prouvée par son extrait passe', () => {
  const produit = { cores: 24, provenance: { cores: source('Total Cores 24') } };
  assert.deepEqual(controleProvenance(['cores'], produit), []);
});

test('une valeur absente, nulle ou vidée ne demande pas de source', () => {
  for (const valeur of [undefined, null, '']) {
    assert.deepEqual(controleProvenance(['cores'], { cores: valeur }), [], String(valeur));
  }
});

test('chaque manque de la source est nommé', () => {
  const sans = controleProvenance(['cores'], { cores: 8 });
  assert.match(sans[0], /cores = 8 sans provenance/);

  const incomplete = controleProvenance(['cores'], {
    cores: 8,
    provenance: { cores: { releve_le: 'hier', extrait: '' } },
  });
  assert.ok(incomplete.some(e => /sans URL/.test(e)));
  assert.ok(incomplete.some(e => /date de releve illisible/.test(e)));
  assert.ok(incomplete.some(e => /sans extrait/.test(e)));
});

test('une date de relevé au format Date est acceptée', () => {
  // Une fiche relue en base porte une Date, pas une chaîne.
  const produit = {
    cores: 24,
    provenance: { cores: { ...source('Total Cores 24'), releve_le: new Date('2026-10-30') } },
  };
  assert.deepEqual(controleProvenance(['cores'], produit), []);
});

test('le nombre doit être isolé dans l extrait', () => {
  assert.equal(valeurPresente('Score 235009', 23500), false);
  assert.equal(valeurPresente('Score 23 500 points', 23500), true);
  assert.equal(valeurPresente('6.7 pouces', 6), false);
});

// --- Qualification (origine, protocole, version, archive) ------------------

const LAPTOP = criteresDe('laptop');
const autonomie = qualification => ({
  battery_life_hours: 12,
  provenance: { battery_life_hours: { ...source('WiFi Websurfing 12h 0min'), ...qualification } },
});

test('la qualification est facultative : une source sans elle passe', () => {
  assert.deepEqual(controleQualification(LAPTOP, autonomie({})), []);
});

test('une qualification valable passe', () => {
  const ok = autonomie({
    origine: 'laboratoire',
    protocole: 'notebookcheck-wifi',
    version: '1.3',
    archive: 'https://web.archive.org/web/2026/https://notebookcheck.net/x',
  });
  assert.deepEqual(controleQualification(LAPTOP, ok), []);
});

test('des champs vides valent des champs absents', () => {
  const vides = autonomie({ origine: '', protocole: '', version: '', archive: '' });
  assert.deepEqual(controleQualification(LAPTOP, vides), []);
});

test('chaque qualification fausse est refusée, motif en clair', () => {
  const motif = q => controleQualification(LAPTOP, autonomie(q)).join(' | ');
  assert.match(motif({ origine: 'labo' }), /origine « labo » inconnue/);
  assert.match(motif({ protocole: 'geekbench-6' }), /non accepté pour ce critère/);
  assert.match(motif({ protocol: 'notebookcheck-wifi' }), /clé de source inconnue \(protocol\)/);
  assert.match(motif({ archive: 'archive.org' }), /n'est pas une URL/);
  assert.match(motif({ version: 'x'.repeat(41) }), /version illisible/);
  assert.match(
    motif({ origine: 'laboratoire', protocole: 'annonce-constructeur' }),
    /annoncée par le constructeur/
  );
});

test('une caractéristique de fiche technique ne prend pas de protocole', () => {
  const ram = {
    ram_gb: 32,
    provenance: { ram_gb: { ...source('Memory 32 GB'), protocole: 'geekbench-6' } },
  };
  assert.match(controleQualification(LAPTOP, ram)[0], /caractéristique de fiche technique/);
});
