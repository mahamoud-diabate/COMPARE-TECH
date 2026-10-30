'use strict';

// Tests de l'API entiere, par HTTP, sans base ni reseau : `app.js` est monte
// avec de faux modeles en memoire et un faux service d'IA. Ils fixent le
// comportement observable des routes (codes, en-tetes, formes de reponse) :
// c'est le filet qui permet de reorganiser le code du serveur sans casser ce
// que le frontend consomme.
const { test, before, after } = require('node:test');
const assert = require('node:assert');

const { creeApp } = require('../app');
const { lireConfig } = require('../config');
const { hashPassword, signToken, verifyToken } = require('../auth');
const { valideProduit } = require('../controles');

// Les controles d'ecriture sont les VRAIS, appliques avec les schemas reels :
// `validateSync` n'ouvre aucune connexion. Seul le stockage est simule.
const SCHEMAS = {
  cpus: require('../models/Cpu'),
  gpus: require('../models/Gpu'),
  laptops: require('../models/Laptop'),
  telephones: require('../models/Telephone'),
};
const controle = (segment, fiche) => valideProduit(SCHEMAS[segment], fiche);

/* ------------------------------------------------------------------ *
 * Faux modeles Mongoose : juste ce que les routes utilisent
 * ------------------------------------------------------------------ */

let compteur = 0;
// Identifiant au format ObjectId (24 caracteres hexadecimaux).
const nouvelId = () => String(++compteur).padStart(24, '0');

function correspond(doc, filtre) {
  if (!filtre || Object.keys(filtre).length === 0) return true;
  if (filtre.$or) return filtre.$or.some(f => correspond(doc, f));
  return Object.entries(filtre).every(([cle, attendu]) => {
    if (attendu && typeof attendu === 'object' && Array.isArray(attendu.$in)) {
      return attendu.$in.includes(doc[cle]);
    }
    return doc[cle] === attendu;
  });
}

/** Requete chainable et « thenable », comme une Query Mongoose. */
function requete(produire) {
  let saut = 0;
  let limite = 0;
  let tri = null;
  const q = {
    skip(n) {
      saut = n;
      return q;
    },
    limit(n) {
      limite = n;
      return q;
    },
    sort(spec) {
      tri = spec;
      return q;
    },
    select() {
      return q;
    },
    lean() {
      return q;
    },
    then(ok, ko) {
      return Promise.resolve()
        .then(() => {
          let resultat = produire();
          if (Array.isArray(resultat)) {
            if (tri) {
              const [cle, sens] = Object.entries(tri)[0];
              resultat = [...resultat].sort((a, b) => sens * ((a[cle] ?? 0) - (b[cle] ?? 0)));
            }
            resultat = resultat.slice(saut, limite ? saut + limite : undefined);
          }
          return resultat;
        })
        .then(ok, ko);
    },
  };
  return q;
}

function fauxModele(initiaux = []) {
  const docs = initiaux.map(d => ({ _id: nouvelId(), ...d }));
  const avecObjet = d => (d ? { ...d, toObject: () => ({ ...d }) } : null);

  class Modele {
    constructor(corps) {
      Object.assign(this, corps);
    }
    async save() {
      const doc = { _id: nouvelId(), ...this };
      docs.push(doc);
      return doc;
    }
    static find(filtre) {
      return requete(() => docs.filter(d => correspond(d, filtre)));
    }
    static findOne(filtre) {
      return {
        sort(spec) {
          return requete(() => docs.filter(d => correspond(d, filtre)))
            .sort(spec)
            .then(liste => avecObjet(liste[0]));
        },
        then(ok, ko) {
          return Promise.resolve(docs.find(d => correspond(d, filtre)) || null).then(ok, ko);
        },
      };
    }
    static async findById(id) {
      return docs.find(d => d._id === id) || null;
    }
    static async countDocuments() {
      return docs.length;
    }
    static async estimatedDocumentCount() {
      return docs.length;
    }
    static async insertMany(liste) {
      const ajoutes = liste.map(d => ({ _id: nouvelId(), ...d }));
      docs.push(...ajoutes);
      return ajoutes;
    }
    static async findByIdAndUpdate(id, maj) {
      const doc = docs.find(d => d._id === id);
      if (!doc) return null;
      Object.assign(doc, maj);
      return doc;
    }
    static async findByIdAndDelete(id) {
      const i = docs.findIndex(d => d._id === id);
      return i === -1 ? null : docs.splice(i, 1)[0];
    }
  }
  Modele.docs = docs;
  return Modele;
}

/* ------------------------------------------------------------------ *
 * Montage
 * ------------------------------------------------------------------ */

const SECRET = 'x'.repeat(48);
const ORIGINE_PROD = 'https://compare-tech-theta.vercel.app';

let promptsRecus = [];
const iaQuiRepond = {
  async generateContent(prompt) {
    promptsRecus.push(prompt);
    return { response: { text: () => 'Verdict de test.' } };
  },
};
const iaEnPanne = {
  async generateContent() {
    throw new Error('quota depasse');
  },
};

async function monte({ env = {}, aiModel = iaQuiRepond, baseConnectee } = {}) {
  const { config } = lireConfig(env);
  const modeles = {
    cpus: fauxModele([
      { name: 'Ryzen A', brand: 'AMD', slug: 'ryzen-a', geekbench_multi: 20000, cores: 16 },
      { name: 'Core B', brand: 'Intel', slug: 'core-b', geekbench_multi: 15000, cores: 8 },
      { name: 'Ryzen C', brand: 'AMD', slug: 'ryzen-c', geekbench_multi: 10000, cores: 6 },
    ]),
    gpus: fauxModele([{ name: 'RTX', brand: 'Nvidia', slug: 'rtx', benchmark_3dmark: 20000 }]),
    laptops: fauxModele([]),
    telephones: fauxModele([{ name: 'Phone', brand: 'X', slug: 'phone', antutu_score: 1 }]),
  };
  const User = fauxModele(
    env.ADMIN_PASSWORD
      ? [{ username: 'admin', passwordHash: await hashPassword(env.ADMIN_PASSWORD) }]
      : []
  );
  const { app } = creeApp({ config, modeles, User, controle, aiModel, baseConnectee });
  const serveur = await new Promise(resolve => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${serveur.address().port}`;
  const appel = (chemin, options = {}) =>
    fetch(base + chemin, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  return { serveur, appel, modeles };
}

const ENV_AUTH = { JWT_SECRET: SECRET, ADMIN_PASSWORD: 'motdepasse-solide' };
const jeton = () => signToken({ sub: '1', username: 'admin' }, SECRET);

let api; // configuration sans authentification
let apiAuth; // configuration avec authentification

before(async () => {
  api = await monte();
  apiAuth = await monte({ env: ENV_AUTH });
});
after(() => {
  api.serveur.close();
  apiAuth.serveur.close();
});

/* ------------------------------------------------------------------ *
 * Routes generales
 * ------------------------------------------------------------------ */

test('GET / repond que le service tourne', async () => {
  const r = await api.appel('/');
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(await r.json(), { status: 'ok', service: 'compare-tech-api' });
});

test('GET /api/health reflete l etat de la base', async () => {
  assert.deepStrictEqual(await (await api.appel('/api/health')).json(), {
    status: 'degraded',
    db: 'disconnected',
  });
  const connectee = await monte({ baseConnectee: () => true });
  assert.deepStrictEqual(await (await connectee.appel('/api/health')).json(), {
    status: 'ok',
    db: 'connected',
  });
  connectee.serveur.close();
});

test('une route inconnue repond 404 en JSON', async () => {
  const r = await api.appel('/api/montres');
  assert.strictEqual(r.status, 404);
  assert.deepStrictEqual(await r.json(), { error: 'Route inconnue.' });
});

/* ------------------------------------------------------------------ *
 * Lecture du catalogue
 * ------------------------------------------------------------------ */

test('GET /api/:segment renvoie un tableau nu, sans en-tete de total', async () => {
  const r = await api.appel('/api/cpus');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.headers.get('x-total-count'), null);
  const corps = await r.json();
  assert.ok(Array.isArray(corps));
  assert.strictEqual(corps.length, 3);
});

test('GET /api/:segment pagine et annonce le total en en-tete', async () => {
  const r = await api.appel('/api/cpus?limit=2&page=2');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.headers.get('x-total-count'), '3');
  const corps = await r.json();
  assert.deepStrictEqual(
    corps.map(d => d.slug),
    ['ryzen-c']
  );
});

test('GET /api/:segment refuse une pagination invalide', async () => {
  const r = await api.appel('/api/cpus?limit=abc');
  assert.strictEqual(r.status, 400);
});

test('GET /api/:segment/marche repond avant /:id, avec cache', async () => {
  const r = await api.appel('/api/cpus/marche');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.headers.get('cache-control'), 'public, max-age=600');
  const corps = await r.json();
  assert.strictEqual(corps.total, 3);
  assert.strictEqual(corps.criteres.geekbench_multi.mesures, 3);
});

test('GET /api/:segment/:id accepte un slug et un identifiant', async () => {
  const parSlug = await api.appel('/api/cpus/core-b');
  assert.strictEqual(parSlug.status, 200);
  const doc = await parSlug.json();
  assert.strictEqual(doc.name, 'Core B');

  const parId = await api.appel(`/api/cpus/${doc._id}`);
  assert.strictEqual((await parId.json()).name, 'Core B');
});

test('GET /api/:segment/:id distingue introuvable et invalide', async () => {
  const absent = await api.appel('/api/cpus/inexistant');
  assert.strictEqual(absent.status, 404);
  assert.deepStrictEqual(await absent.json(), { error: 'cpu non trouve.' });

  const invalide = await api.appel('/api/cpus/Pas_Un_Slug');
  assert.strictEqual(invalide.status, 400);
});

test('GET /api/featured renvoie le meilleur de chaque collection', async () => {
  const corps = await (await api.appel('/api/featured')).json();
  const cpu = corps.find(p => p.productType === 'cpu');
  assert.strictEqual(cpu.name, 'Ryzen A');
  assert.strictEqual(cpu.highlight, 'Top CPU');
  assert.ok(!corps.some(p => p.productType === 'laptop'), 'collection vide : pas de vedette');
});

/* ------------------------------------------------------------------ *
 * Comparaison
 * ------------------------------------------------------------------ */

test('POST /compare valide la liste demandee', async () => {
  assert.strictEqual(
    (await api.appel('/api/cpus/compare', { method: 'POST', body: {} })).status,
    400
  );
  const onze = Array.from({ length: 11 }, (_, i) => `p-${i}`);
  assert.strictEqual(
    (await api.appel('/api/cpus/compare', { method: 'POST', body: { ids: onze } })).status,
    400
  );
  const rien = await api.appel('/api/cpus/compare', { method: 'POST', body: { ids: ['$$'] } });
  assert.deepStrictEqual(await rien.json(), { error: 'Aucun identifiant valide.' });
});

test('POST /compare melange slugs et identifiants', async () => {
  const id = api.modeles.cpus.docs.find(d => d.slug === 'ryzen-c')._id;
  const r = await api.appel('/api/cpus/compare', {
    method: 'POST',
    body: { ids: ['ryzen-a', id] },
  });
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual((await r.json()).map(d => d.slug).sort(), ['ryzen-a', 'ryzen-c']);
});

/* ------------------------------------------------------------------ *
 * Authentification et ecritures
 * ------------------------------------------------------------------ */

test('sans configuration, connexion et ecritures repondent 503', async () => {
  const login = await api.appel('/api/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'x' },
  });
  assert.strictEqual(login.status, 503);
  const ecriture = await api.appel('/api/cpus', { method: 'POST', body: { name: 'X' } });
  assert.strictEqual(ecriture.status, 503);
});

test('la connexion verifie les champs et le mot de passe', async () => {
  const vide = await apiAuth.appel('/api/auth/login', { method: 'POST', body: {} });
  assert.strictEqual(vide.status, 400);

  const faux = await apiAuth.appel('/api/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'mauvais' },
  });
  assert.strictEqual(faux.status, 401);

  const bon = await apiAuth.appel('/api/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: ENV_AUTH.ADMIN_PASSWORD },
  });
  assert.strictEqual(bon.status, 200);
  const { token } = await bon.json();
  assert.strictEqual(verifyToken(token, SECRET).username, 'admin');
});

test('une ecriture sans jeton valide repond 401', async () => {
  const sans = await apiAuth.appel('/api/cpus', { method: 'POST', body: { name: 'X' } });
  assert.strictEqual(sans.status, 401);
  const mauvais = await apiAuth.appel('/api/cpus', {
    method: 'POST',
    body: { name: 'X' },
    headers: { Authorization: 'Bearer abc.def.ghi' },
  });
  assert.strictEqual(mauvais.status, 401);
});

test('creation, modification et suppression avec un jeton valide', async () => {
  const auth = { Authorization: `Bearer ${jeton()}` };

  const cree = await apiAuth.appel('/api/gpus', {
    method: 'POST',
    headers: auth,
    body: { name: 'RX', brand: 'AMD', $where: 'injection', 'a.b': 1 },
  });
  assert.strictEqual(cree.status, 201);
  const doc = await cree.json();
  assert.strictEqual(doc.name, 'RX');
  assert.ok(!('$where' in doc) && !('a.b' in doc), 'operateurs Mongo retires du corps');

  const maj = await apiAuth.appel(`/api/gpus/${doc._id}`, {
    method: 'PUT',
    headers: auth,
    body: { memory_gb: 16, provenance: { memory_gb: source('16 GB GDDR6') } },
  });
  assert.strictEqual(maj.status, 200);
  assert.strictEqual((await maj.json()).memory_gb, 16);

  const invalide = await apiAuth.appel('/api/gpus/pas-un-id', { method: 'PUT', headers: auth });
  assert.strictEqual(invalide.status, 400);

  const suppr = await apiAuth.appel(`/api/gpus/${doc._id}`, { method: 'DELETE', headers: auth });
  assert.deepStrictEqual(await suppr.json(), { message: 'gpu supprime.' });

  const absent = await apiAuth.appel(`/api/gpus/${doc._id}`, { method: 'DELETE', headers: auth });
  assert.strictEqual(absent.status, 404);
});

/* ------------------------------------------------------------------ *
 * Controles d'ecriture : memes regles que l'importateur
 * ------------------------------------------------------------------ */

const source = extrait => ({
  url: 'https://www.notebookcheck.net/fiche.html',
  releve_le: '2026-10-30',
  extrait,
});
const AUTH = () => ({ Authorization: `Bearer ${jeton()}` });

test('une creation refuse une mesure sans source, motifs en clair', async () => {
  const r = await apiAuth.appel('/api/cpus', {
    method: 'POST',
    headers: AUTH(),
    body: { name: 'Sans source', brand: 'AMD', cores: 8 },
  });
  assert.strictEqual(r.status, 400);
  const corps = await r.json();
  assert.match(corps.error, /source/);
  assert.ok(corps.erreurs.some(e => /cores = 8 sans provenance/.test(e)));
  assert.ok(!apiAuth.modeles.cpus.docs.some(d => d.name === 'Sans source'), 'rien n est ecrit');
});

test('une creation refuse une valeur absente de son extrait', async () => {
  const r = await apiAuth.appel('/api/cpus', {
    method: 'POST',
    headers: AUTH(),
    body: {
      name: 'Mauvais extrait',
      brand: 'AMD',
      cores: 91,
      provenance: { cores: source('Total Cores 24') },
    },
  });
  assert.strictEqual(r.status, 400);
  assert.ok((await r.json()).erreurs.some(e => /absent de son propre extrait/.test(e)));
});

test('une creation refuse un champ inconnu du modele et une valeur hors plage', async () => {
  const r = await apiAuth.appel('/api/cpus', {
    method: 'POST',
    headers: AUTH(),
    body: {
      name: 'Hors plage',
      brand: 'AMD',
      max_freq_ghz: 570,
      provenance: { max_freq_ghz: source('Boost 570 GHz') },
      prix_eur: 300,
    },
  });
  const { erreurs } = await r.json();
  assert.ok(erreurs.some(e => /prix_eur : champ inconnu/.test(e)));
  assert.ok(erreurs.some(e => /^max_freq_ghz :/.test(e)));
});

test('une creation prouvee est acceptee', async () => {
  const r = await apiAuth.appel('/api/cpus', {
    method: 'POST',
    headers: AUTH(),
    body: {
      name: 'Prouve',
      brand: 'AMD',
      cores: 24,
      provenance: { cores: source('Total Cores 24') },
    },
  });
  assert.strictEqual(r.status, 201);
});

test('un lot avec une seule fiche invalide n ecrit rien', async () => {
  const avant = apiAuth.modeles.laptops.docs.length;
  const r = await apiAuth.appel('/api/laptops', {
    method: 'POST',
    headers: AUTH(),
    body: [
      { name: 'Bon', brand: 'A', ram_gb: 16, provenance: { ram_gb: source('Memory 16 GB') } },
      { name: 'Mauvais', brand: 'B', ram_gb: 32 },
    ],
  });
  assert.strictEqual(r.status, 400);
  const { erreurs } = await r.json();
  assert.ok(
    erreurs.every(e => e.startsWith('#2 (Mauvais)')),
    'le motif nomme la fiche fautive'
  );
  assert.strictEqual(apiAuth.modeles.laptops.docs.length, avant);
});

test('une modification est controlee sur la fiche complete qu elle produit', async () => {
  const cree = await apiAuth.appel('/api/telephones', {
    method: 'POST',
    headers: AUTH(),
    body: {
      name: 'Tel',
      brand: 'T',
      ram_gb: 8,
      battery_mah: 5000,
      provenance: { ram_gb: source('RAM 8 GB'), battery_mah: source('Capacity 5000 mAh') },
    },
  });
  const { _id } = await cree.json();

  // Nouvelle valeur sans nouvelle source : l'ancienne source ne la prouve pas.
  const sansSource = await apiAuth.appel(`/api/telephones/${_id}`, {
    method: 'PUT',
    headers: AUTH(),
    body: { ram_gb: 12 },
  });
  assert.strictEqual(sansSource.status, 400);

  // Avec sa source : accepte, et la source de la batterie est conservee.
  const prouvee = await apiAuth.appel(`/api/telephones/${_id}`, {
    method: 'PUT',
    headers: AUTH(),
    body: { ram_gb: 12, provenance: { ram_gb: source('RAM 12 GB') } },
  });
  assert.strictEqual(prouvee.status, 200);
  const doc = await prouvee.json();
  assert.strictEqual(doc.ram_gb, 12);
  assert.strictEqual(doc.provenance.battery_mah.extrait, 'Capacity 5000 mAh');

  // Retirer une valeur ne demande pas de source.
  const retrait = await apiAuth.appel(`/api/telephones/${_id}`, {
    method: 'PUT',
    headers: AUTH(),
    body: { battery_mah: null },
  });
  assert.strictEqual(retrait.status, 200);
});

test('une fiche existante sans source ne peut pas etre modifiee en l etat', async () => {
  // Les fiches de depart des faux modeles n'ont aucune provenance : toute
  // modification doit d'abord les sourcer, meme pour changer le nom.
  const id = apiAuth.modeles.cpus.docs.find(d => d.slug === 'ryzen-a')._id;
  const r = await apiAuth.appel(`/api/cpus/${id}`, {
    method: 'PUT',
    headers: AUTH(),
    body: { name: 'Ryzen A renomme' },
  });
  assert.strictEqual(r.status, 400);
  assert.ok((await r.json()).erreurs.some(e => /geekbench_multi = 20000 sans provenance/.test(e)));
});

test('creeApp refuse de monter les ecritures sans controle', () => {
  const { config } = lireConfig({});
  assert.throws(
    () => creeApp({ config, modeles: { cpus: fauxModele() }, User: fauxModele() }),
    /exige une fonction `controle/
  );
});

test('une insertion en lot est plafonnee a 500 documents', async () => {
  const lot = Array.from({ length: 501 }, (_, i) => ({ name: `P${i}`, brand: 'B' }));
  const r = await apiAuth.appel('/api/laptops', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jeton()}` },
    body: lot,
  });
  // 501 objets depassent aussi la limite de 100 ko ? Non : ils restent sous la
  // limite, c'est bien le plafond metier qui repond.
  assert.strictEqual(r.status, 400);
  assert.deepStrictEqual(await r.json(), { error: 'Maximum 500 documents par insertion.' });
});

/* ------------------------------------------------------------------ *
 * Verdict IA
 * ------------------------------------------------------------------ */

test('verdict IA : 503 sans modele, 400 sans produits valides', async () => {
  const sansIa = await monte({ aiModel: null });
  const r = await sansIa.appel('/api/ai/verdict', { method: 'POST', body: {} });
  assert.strictEqual(r.status, 503);
  sansIa.serveur.close();

  const vide = await api.appel('/api/ai/verdict', { method: 'POST', body: { product1: {} } });
  assert.strictEqual(vide.status, 400);
});

test('verdict IA : seuls les champs autorises partent dans le prompt', async () => {
  promptsRecus = [];
  const r = await api.appel('/api/ai/verdict', {
    method: 'POST',
    body: {
      product1: {
        _id: 'secret-interne',
        name: 'Ryzen A',
        geekbench_multi: 20000,
        note_cachee: 'x',
      },
      product2: { name: 'Core B', geekbench_multi: 15000 },
    },
  });
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(await r.json(), { aiResponse: 'Verdict de test.' });
  const prompt = promptsRecus[0];
  assert.ok(prompt.includes('"geekbench_multi":20000'));
  assert.ok(!prompt.includes('secret-interne') && !prompt.includes('note_cachee'));
});

test('verdict IA : une panne repond 502 sans details en production', async () => {
  const enPanne = await monte({ aiModel: iaEnPanne, env: { NODE_ENV: 'production' } });
  const r = await enPanne.appel('/api/ai/verdict', {
    method: 'POST',
    body: { product1: { name: 'A' }, product2: { name: 'B' } },
  });
  assert.strictEqual(r.status, 502);
  assert.deepStrictEqual(await r.json(), { error: "L'IA n'a pas pu generer de reponse." });
  enPanne.serveur.close();
});

/* ------------------------------------------------------------------ *
 * CORS
 * ------------------------------------------------------------------ */

test('CORS : origine de production acceptee, X-Total-Count expose', async () => {
  const r = await api.appel('/api/cpus?limit=1', { headers: { Origin: ORIGINE_PROD } });
  assert.strictEqual(r.headers.get('access-control-allow-origin'), ORIGINE_PROD);
  assert.strictEqual(r.headers.get('access-control-expose-headers'), 'X-Total-Count');
});

test('CORS : origine inconnue refusee en 403', async () => {
  const r = await api.appel('/api/cpus', {
    headers: { Origin: 'https://compare-tech-evil.vercel.app' },
  });
  assert.strictEqual(r.status, 403);
  assert.deepStrictEqual(await r.json(), { error: 'Origine non autorisee.' });
});
