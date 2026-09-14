'use strict';

// Tests de `origines.js` — la liste blanche CORS.
//
// Le coeur de ces tests est negatif : ils fixent ce que l'API doit REFUSER.
// Une version precedente autorisait tout `compare-tech*.vercel.app` par motif,
// alors que n'importe qui peut faire attribuer un nom d'hote sous ce domaine
// partage. Les cas « origine forgee » ci-dessous existent pour qu'un motif de
// ce genre ne puisse pas revenir sans casser la suite.
const { test } = require('node:test');
const assert = require('node:assert');

const {
  ORIGINES_PRODUCTION,
  ORIGINES_DEV,
  construitListeBlanche,
  origineAutorisee,
} = require('../origines');

const enProd = () => construitListeBlanche({ enProduction: true });

/* ---------------- Construction de la liste ---------------- */

test('les origines de production sont toujours presentes', () => {
  for (const origine of ORIGINES_PRODUCTION) {
    assert.ok(enProd().includes(origine), `${origine} doit rester autorisee`);
  }
});

test('les origines localhost sont exclues en production', () => {
  const liste = enProd();
  for (const origine of ORIGINES_DEV) {
    assert.ok(!liste.includes(origine), `${origine} ne doit pas passer en production`);
  }
});

test('les origines localhost sont presentes hors production', () => {
  const liste = construitListeBlanche({ enProduction: false });
  for (const origine of ORIGINES_DEV) {
    assert.ok(liste.includes(origine));
  }
});

test('CORS_ORIGINS ajoute des origines sans effacer les connues', () => {
  const liste = construitListeBlanche({
    corsOrigins: 'https://apercu.example.com, https://autre.example.com',
    enProduction: true,
  });
  assert.ok(liste.includes('https://apercu.example.com'));
  assert.ok(liste.includes('https://autre.example.com'));
  assert.ok(liste.includes(ORIGINES_PRODUCTION[0]));
});

test('CORS_ORIGINS tolere les espaces et les entrees vides', () => {
  const liste = construitListeBlanche({ corsOrigins: ' , https://a.test ,, ', enProduction: true });
  assert.ok(liste.includes('https://a.test'));
  assert.ok(!liste.includes(''));
});

test('la liste ne contient pas de doublon', () => {
  const liste = construitListeBlanche({
    corsOrigins: ORIGINES_PRODUCTION[0],
    enProduction: true,
  });
  assert.strictEqual(new Set(liste).size, liste.length);
});

/* ---------------- Decision ---------------- */

test('une origine de la liste est autorisee', () => {
  assert.ok(origineAutorisee(ORIGINES_PRODUCTION[0], enProd()));
});

test('une requete sans origine est autorisee', () => {
  // curl, appel serveur-a-serveur, navigation directe : pas de page tierce a
  // proteger, et les ecritures exigent de toute facon un jeton.
  assert.ok(origineAutorisee(undefined, enProd()));
  assert.ok(origineAutorisee('', enProd()));
});

/*
 * Les cas qui comptent : des noms d'hote qu'un tiers peut se faire attribuer
 * sur vercel.app, et que l'ancien motif acceptait.
 */
test('une origine Vercel forgee est refusee', () => {
  const liste = enProd();
  const forgees = [
    'https://compare-tech-evil.vercel.app',
    'https://compare-tech.vercel.app',
    'https://compare-tech-2.vercel.app',
    // Meme en imitant le suffixe du compte : un projet personnel portant ce
    // nom recoit exactement ce nom d'hote.
    'https://compare-tech-evil-king2mos-projects.vercel.app',
  ];
  for (const origine of forgees) {
    assert.ok(!origineAutorisee(origine, liste), `${origine} ne doit PAS etre autorisee`);
  }
});

test('une origine qui prefixe ou suffixe une origine connue est refusee', () => {
  const liste = enProd();
  const proches = [
    'https://compare-tech-theta.vercel.app.evil.com',
    'https://evil.com/https://compare-tech-theta.vercel.app',
    'https://compare-tech-theta.vercel.app/',
    'http://compare-tech-theta.vercel.app',
    'https://xcompare-tech-theta.vercel.app',
  ];
  for (const origine of proches) {
    assert.ok(!origineAutorisee(origine, liste), `${origine} ne doit PAS etre autorisee`);
  }
});

test('une origine quelconque est refusee', () => {
  assert.ok(!origineAutorisee('https://evil.example.com', enProd()));
});

test('localhost est refuse en production', () => {
  assert.ok(!origineAutorisee('http://localhost:5173', enProd()));
});

test('une origine qui n est pas une chaine est refusee', () => {
  assert.ok(!origineAutorisee({ toString: () => ORIGINES_PRODUCTION[0] }, enProd()));
  assert.ok(!origineAutorisee(['https://compare-tech-theta.vercel.app'], enProd()));
});
