'use strict';

// Tests de l'adaptateur DeepSeek : il doit presenter a `routes/ia.js` la meme
// forme que Gemini (`generateContent` -> `{ response: { text() } }`) et parler
// a l'API DeepSeek comme elle l'attend. Aucun reseau : le client HTTP est
// injecte.
const { test } = require('node:test');
const assert = require('node:assert');

const { creeModeleDeepseek, URL_DEFAUT, MODELE_DEFAUT } = require('../ia-deepseek');

function fauxHttp(reponse = {}, erreur = null) {
  const appels = [];
  return {
    appels,
    async post(url, corps, options) {
      appels.push({ url, corps, options });
      if (erreur) throw erreur;
      return { data: reponse };
    },
  };
}

test('envoie le prompt a DeepSeek avec la cle en en-tete', async () => {
  const http = fauxHttp({ choices: [{ message: { content: 'Verdict redige.' } }] });
  const modele = creeModeleDeepseek({ apiKey: 'cle-de-test', http });

  const resultat = await modele.generateContent('Redige un verdict.');
  const texte = resultat.response.text();

  assert.strictEqual(texte, 'Verdict redige.');
  assert.strictEqual(http.appels.length, 1);
  const { url, corps, options } = http.appels[0];
  assert.strictEqual(url, URL_DEFAUT);
  assert.strictEqual(corps.model, MODELE_DEFAUT);
  assert.deepStrictEqual(corps.messages, [{ role: 'user', content: 'Redige un verdict.' }]);
  assert.strictEqual(corps.stream, false);
  assert.strictEqual(options.headers.Authorization, 'Bearer cle-de-test');
});

test('accepte un modele impose par la configuration', async () => {
  const http = fauxHttp({ choices: [{ message: { content: 'ok' } }] });
  await creeModeleDeepseek({ apiKey: 'k', model: 'deepseek-v4-pro', http }).generateContent('x');
  assert.strictEqual(http.appels[0].corps.model, 'deepseek-v4-pro');
});

test('rend un texte vide plutot que de planter si la reponse est inattendue', async () => {
  const http = fauxHttp({});
  const resultat = await creeModeleDeepseek({ apiKey: 'k', http }).generateContent('x');
  assert.strictEqual(resultat.response.text(), '');
});

test('refuse de se construire sans cle', () => {
  assert.throws(() => creeModeleDeepseek({ apiKey: '' }), /cle absente/);
});

test("laisse remonter l'erreur du fournisseur, sans y glisser la cle", async () => {
  const erreur = new Error('401 Unauthorized');
  erreur.config = { headers: { Authorization: 'Bearer cle-secrete' } };
  const http = fauxHttp({}, erreur);
  const modele = creeModeleDeepseek({ apiKey: 'cle-secrete', http });

  await assert.rejects(
    () => modele.generateContent('x'),
    err => {
      assert.match(err.message, /401/);
      assert.ok(!String(err.message).includes('cle-secrete'));
      return true;
    }
  );
});
