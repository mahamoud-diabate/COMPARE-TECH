'use strict';

/*
 * Adaptateur DeepSeek.
 *
 * La route IA (`routes/ia.js`) ne connait qu'une chose du fournisseur : un
 * objet qui expose `generateContent(prompt)` et rend `{ response: { text() } }`.
 * C'est la forme du modele Gemini. Cet adaptateur donne la meme forme a
 * l'API DeepSeek, qui est compatible OpenAI : un POST /chat/completions, la
 * cle en en-tete `Authorization: Bearer`, le texte dans `choices[0].message.content`.
 *
 * Consequences utiles : la route n'a pas deux chemins a maintenir, et les
 * garde-fous (verdict calcule, chiffres inventes ecartes, cache 24 h, 502 en
 * cas de panne) s'appliquent au mot pres de la meme facon.
 *
 * La cle n'est jamais journalisee, jamais renvoyee et jamais incluse dans une
 * erreur : seule sa presence est verifiee.
 */

const axios = require('axios');

const URL_DEFAUT = 'https://api.deepseek.com/chat/completions';
const MODELE_DEFAUT = 'deepseek-flash';

/**
 * @param {object} options
 * @param {string} options.apiKey        cle DeepSeek (obligatoire)
 * @param {string} [options.model]       modele, `deepseek-flash` par defaut
 * @param {string} [options.url]         point d'entree (surchargeable en test)
 * @param {object} [options.http]        client HTTP (axios par defaut)
 * @param {number} [options.timeoutMs]   delai maximal d'une generation
 * @returns {{generateContent: (prompt: string) => Promise<{response: {text: () => string}}>}}
 */
function creeModeleDeepseek({
  apiKey,
  model = MODELE_DEFAUT,
  url = URL_DEFAUT,
  http = axios,
  timeoutMs = 60000,
} = {}) {
  if (!apiKey) throw new Error('creeModeleDeepseek : cle absente.');
  return {
    async generateContent(prompt) {
      const { data } = await http.post(
        url,
        {
          model,
          messages: [{ role: 'user', content: String(prompt || '') }],
          stream: false,
          temperature: 0.2,
        },
        {
          timeout: timeoutMs,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const texte = data?.choices?.[0]?.message?.content ?? '';
      return { response: { text: () => texte } };
    },
  };
}

module.exports = { creeModeleDeepseek, URL_DEFAUT, MODELE_DEFAUT };
