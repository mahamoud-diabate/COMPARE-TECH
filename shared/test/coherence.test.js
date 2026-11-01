// Tests de cohérence de la notation (étude de cas : « dominance, direction de
// chaque critère, version du barème »). Ils ne vérifient pas une valeur
// précise : ils vérifient qu'AUCUNE formule ne peut classer deux produits à
// l'envers, quelles que soient les mesures.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TYPES, critere } from '../criteres.js';
import { FORMULES, explainScore } from '../formules.js';
import { BAREME, PROFILS, noteProfil } from '../usages.js';

// Générateur pseudo-aléatoire à graine fixe : des tests reproductibles.
function aleatoire(graine) {
  let x = graine;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

/** Toutes les formules notables : note globale et profils, par catégorie. */
function notations() {
  const liste = [];
  for (const type of TYPES) {
    liste.push({
      nom: `${type} : note globale`,
      type,
      cles: FORMULES[type].termes.map(t => t.key),
      note: p => explainScore(p, type).total,
    });
    for (const profil of PROFILS[type]) {
      liste.push({
        nom: `${type} : ${profil.id}`,
        type,
        cles: profil.termes.map(t => t.key),
        note: p => noteProfil(p, type, profil).note,
      });
    }
  }
  return liste;
}

/** Un produit aux mesures tirées entre 20 % et 120 % de la référence. */
function produitAuHasard(type, cles, tirage) {
  return Object.fromEntries(cles.map(k => [k, BAREME.references[type][k] * (0.2 + tirage())]));
}

test('aucune formule ne combine un critère dont le plus bas est le meilleur', () => {
  // Les formules supposent « plus haut = meilleur » ; un critère inversé (TDP)
  // y ferait monter la note d'un produit plus gourmand.
  for (const n of notations()) {
    for (const cle of n.cles) {
      assert.equal(critere(n.type, cle).inverse, false, `${n.nom} : ${cle} est inversé`);
    }
  }
});

test('direction : améliorer une seule mesure ne fait jamais baisser une note', () => {
  const tirage = aleatoire(42);
  for (const n of notations()) {
    for (let essai = 0; essai < 200; essai++) {
      const base = produitAuHasard(n.type, n.cles, tirage);
      for (const cle of n.cles) {
        const mieux = { ...base, [cle]: base[cle] * (1.01 + tirage()) };
        assert.ok(n.note(mieux) >= n.note(base), `${n.nom} : ${cle} augmente, la note baisse`);
      }
    }
  }
});

test('dominance : meilleur ou égal partout donne une note au moins égale', () => {
  const tirage = aleatoire(7);
  for (const n of notations()) {
    for (let essai = 0; essai < 500; essai++) {
      const b = produitAuHasard(n.type, n.cles, tirage);
      const a = Object.fromEntries(n.cles.map(k => [k, b[k] * (1 + tirage() * 0.5)]));
      assert.ok(
        n.note(a) >= n.note(b),
        `${n.nom} : ${JSON.stringify(a)} domine ${JSON.stringify(b)} mais note moins`
      );
    }
  }
});

test('une mesure manquante ne rend jamais une note meilleure', () => {
  const tirage = aleatoire(99);
  for (const n of notations()) {
    const complet = produitAuHasard(n.type, n.cles, tirage);
    for (const cle of n.cles) {
      const sans = { ...complet };
      delete sans[cle];
      const note = n.note(sans);
      // Non noté (null ou 0) : jamais une note supérieure obtenue en cachant une mesure.
      assert.ok(
        note === null || note === 0 || note <= n.note(complet) || n.cles.length === 1,
        n.nom
      );
    }
  }
});

test('le barème est versionné et chaque référence est positive', () => {
  assert.match(BAREME.version, /^v\d+$/);
  for (const [type, refs] of Object.entries(BAREME.references)) {
    for (const [cle, valeur] of Object.entries(refs)) {
      assert.ok(valeur > 0, `${type}.${cle}`);
    }
  }
});
