'use strict';

// Lecture de la configuration : deux fournisseurs d'IA possibles, et un seul
// avertissement quand aucun n'est renseigne. Ces tests fixent les defauts et
// le fait qu'une cle vide ne compte pas comme une cle.
const { test } = require('node:test');
const assert = require('node:assert');

const { lireConfig, MODELE_IA_DEFAUT, MODELE_DEEPSEEK_DEFAUT } = require('../config');

test('DeepSeek est lu, avec son modele par defaut', () => {
  const { config } = lireConfig({ DEEPSEEK_API_KEY: 'cle-de-test' });
  assert.strictEqual(config.deepseekApiKey, 'cle-de-test');
  assert.strictEqual(config.deepseekModel, MODELE_DEEPSEEK_DEFAUT);
  assert.strictEqual(MODELE_DEEPSEEK_DEFAUT, 'deepseek-flash');
  // Gemini reste independant : l'un n'implique pas l'autre.
  assert.strictEqual(config.geminiApiKey, '');
});

test('le modele DeepSeek peut etre impose', () => {
  const { config } = lireConfig({
    DEEPSEEK_API_KEY: 'cle-de-test',
    DEEPSEEK_MODEL: 'deepseek-v4-pro',
  });
  assert.strictEqual(config.deepseekModel, 'deepseek-v4-pro');
});

test('le modele Gemini garde son defaut historique', () => {
  const { config } = lireConfig({ GEMINI_API_KEY: 'cle-de-test' });
  assert.strictEqual(config.geminiModel, MODELE_IA_DEFAUT);
});

test('aucun fournisseur : un seul avertissement, qui nomme les deux variables', () => {
  const { avertissements } = lireConfig({});
  const ia = avertissements.filter(a => /api\/ai\/verdict/.test(a));
  assert.strictEqual(ia.length, 1);
  assert.match(ia[0], /GEMINI_API_KEY/);
  assert.match(ia[0], /DEEPSEEK_API_KEY/);
});

test('un fournisseur suffit : plus aucun avertissement sur la route IA', () => {
  for (const env of [{ GEMINI_API_KEY: 'k' }, { DEEPSEEK_API_KEY: 'k' }]) {
    const { avertissements } = lireConfig(env);
    assert.strictEqual(
      avertissements.filter(a => /api\/ai\/verdict/.test(a)).length,
      0,
      JSON.stringify(Object.keys(env))
    );
  }
});

test('une cle vide ne compte pas comme une cle', () => {
  const { config, avertissements } = lireConfig({ GEMINI_API_KEY: '', DEEPSEEK_API_KEY: '' });
  assert.strictEqual(config.geminiApiKey, '');
  assert.strictEqual(config.deepseekApiKey, '');
  assert.strictEqual(avertissements.filter(a => /api\/ai\/verdict/.test(a)).length, 1);
});
