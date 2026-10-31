/*
 * Sonde de page : affiche ce que `import.js --verifier` lit sur une page,
 * autour de mots-clés, pour recopier des extraits exacts.
 *
 * Pourquoi ce script existe : un navigateur, ou un outil de lecture du web,
 * ne voit pas toujours la même chose que le vérificateur (page rendue par
 * JavaScript, cache, reformulation). Le 30 octobre 2026, un extrait relevé
 * ainsi annonçait « Cinebench 2024 (Multi) 2359 » quand la page servie au
 * vérificateur disait 2261. Recopier depuis la sortie de cette sonde, c'est
 * recopier exactement ce qui sera vérifié.
 *
 * Lecture seule : télécharge des pages publiques, n'écrit rien, n'ouvre
 * aucune connexion à la base.
 *
 * Usage :
 *   node scripts/sonde-page.js --mots="Released,Time Spy,Memory Size" URL [URL…]
 */

const axios = require('axios');
const cheerio = require('cheerio');

// Même en-tête que le vérificateur : certains sites servent une page
// différente selon le client.
const AGENT = 'CompareTech/1.0 (verification de provenance)';
const LARGEUR = 70;
const MAX_PAR_MOT = 3;

async function texteDe(url) {
  const { data } = await axios.get(url, { timeout: 20000, headers: { 'User-Agent': AGENT } });
  return cheerio.load(data).text().replace(/\s+/g, ' ');
}

/** Les passages qui commencent par `mot` (casse ignorée), au plus `max`. */
function passages(texte, mot, max = MAX_PAR_MOT) {
  const bas = texte.toLowerCase();
  const cible = mot.toLowerCase();
  const trouves = [];
  let i = bas.indexOf(cible);
  while (i >= 0 && trouves.length < max) {
    trouves.push(texte.slice(i, i + LARGEUR));
    i = bas.indexOf(cible, i + 1);
  }
  return trouves;
}

async function main() {
  const args = process.argv.slice(2);
  const motsArg = args.find(a => a.startsWith('--mots='));
  const urls = args.filter(a => !a.startsWith('--'));
  if (!motsArg || urls.length === 0) {
    console.error('Usage : node scripts/sonde-page.js --mots="mot1,mot2" URL [URL…]');
    process.exit(1);
  }
  const mots = motsArg
    .slice('--mots='.length)
    .split(',')
    .map(m => m.trim())
    .filter(Boolean);

  for (const url of urls) {
    console.log(`\n== ${url}`);
    try {
      const texte = await texteDe(url);
      for (const mot of mots) {
        const trouves = passages(texte, mot);
        if (trouves.length === 0) console.log(`  [${mot}] ABSENT`);
        for (const p of trouves) console.log(`  [${mot}] ${p}`);
      }
    } catch (err) {
      console.log(`  page injoignable (${err.message})`);
    }
  }
}

if (require.main === module) main();

module.exports = { passages };
