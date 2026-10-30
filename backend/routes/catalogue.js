'use strict';

/*
 * Routes des quatre collections (cpus, gpus, laptops, telephones), plus la
 * page d'accueil (`/api/featured`).
 *
 * Les quatre collections partagent la meme logique : une seule definition
 * evite les divergences (une ancienne version dupliquait 4 fois chaque route).
 */

const { lecturePaginee } = require('../pagination');
const { CHAMPS_MARCHE, resumeMarche } = require('../marche');
const { SLUG_VALIDE, estIdentifiant, estReference } = require('../references');

/*
 * Resume « dans le marche » : distribution de chaque critere sur toute la
 * collection, pour situer un produit parmi ses pairs sans envoyer le
 * catalogue entier au navigateur.
 *
 * Cache d'une heure, en memoire du processus : la distribution ne bouge qu'a
 * l'import, jamais a la visite. Sans ce cache, le premier visiteur de chaque
 * page comparative paierait la lecture complete de la collection.
 */
const DUREE_CACHE_MARCHE = 60 * 60 * 1000;

function creeLectureMarche() {
  const cacheMarche = new Map();

  return async function lectureMarche(segment, Model, champs) {
    const enCache = cacheMarche.get(segment);
    if (enCache && enCache.expire > Date.now()) return enCache.resume;

    // Projection reduite aux criteres : un catalogue de 10 000 fiches ne fait
    // transiter que les quelques nombres utiles, pas les noms, images et
    // descriptions.
    const projection = champs.map(champ => champ.key).join(' ');
    const [documents, total] = await Promise.all([
      // `.lean()` ici, contrairement a la route de liste : le plugin
      // `catalogue` ne convertit que des mesures stockees en texte, et
      // `marche.js` les relit lui-meme avec tolerance. Aucune fiche n'est
      // renvoyee telle quelle.
      Model.find({}).select(projection).lean(),
      Model.estimatedDocumentCount(),
    ]);

    const resume = resumeMarche(documents, champs, total);
    cacheMarche.set(segment, { resume, expire: Date.now() + DUREE_CACHE_MARCHE });
    return resume;
  };
}

/** Reponse de refus : les motifs sont destines a l'utilisateur, en clair. */
function refuse(res, erreurs) {
  return res.status(400).json({
    error: 'Fiche refusée : chaque mesure doit avoir une source qui la contient.',
    erreurs,
  });
}

const nomDe = fiche => (fiche && typeof fiche.name === 'string' && fiche.name) || 'sans nom';

/** Document Mongoose -> objet simple ; la provenance (une Map) devient un objet. */
function enObjet(doc) {
  if (doc && typeof doc.toObject === 'function') return doc.toObject({ flattenMaps: true });
  return { ...doc };
}

/** Produits vedettes de la page d'accueil : le meilleur de chaque collection. */
function monteVedettes(app, { modeles, fail }) {
  const { cpus: Cpu, gpus: Gpu, laptops: Laptop, telephones: Telephone } = modeles;

  app.get('/api/featured', async (_req, res) => {
    try {
      const [bestCpu, bestGpu, bestLaptop, bestPhone] = await Promise.all([
        Cpu.findOne().sort({ geekbench_multi: -1 }),
        Gpu.findOne().sort({ benchmark_3dmark: -1 }),
        Laptop.findOne().sort({ geekbench_multi: -1 }),
        Telephone.findOne().sort({ antutu_score: -1 }),
      ]);

      const featured = [];
      if (bestCpu)
        featured.push({ ...bestCpu.toObject(), productType: 'cpu', highlight: 'Top CPU' });
      if (bestGpu)
        featured.push({ ...bestGpu.toObject(), productType: 'gpu', highlight: 'Top GPU' });
      if (bestLaptop)
        featured.push({ ...bestLaptop.toObject(), productType: 'laptop', highlight: 'Top Laptop' });
      if (bestPhone)
        featured.push({
          ...bestPhone.toObject(),
          productType: 'telephone',
          highlight: 'Top Smartphone',
        });

      res.json(featured);
    } catch (err) {
      fail(res, 500, 'Erreur lors de la recuperation des produits vedettes.', err);
    }
  });
}

/**
 * Routes de lecture et d'ecriture de chaque collection.
 *
 * L'ordre de declaration compte : `/marche` et `/compare` avant `/:id`, sinon
 * Express lirait « marche » comme un identifiant de fiche.
 */
function monteCollections(app, { modeles, fail, requireAuth, writeLimiter, controle }) {
  if (typeof controle !== 'function') {
    // Pas de valeur par defaut : une API montee sans controle accepterait
    // n'importe quelle fiche, et rien ne le signalerait.
    throw new Error('monteCollections exige une fonction `controle(segment, fiche)`.');
  }
  const lectureMarche = creeLectureMarche();

  for (const [segment, Model] of Object.entries(modeles)) {
    const label = segment.slice(0, -1);

    app.get(`/api/${segment}`, async (req, res) => {
      const page = lecturePaginee(req.query);
      if (page.erreur) return res.status(400).json({ error: page.erreur });
      try {
        // Pas de `.lean()` ici, malgre le gain : le plugin `catalogue`
        // convertit les anciennes mesures stockees en texte (« 6.8 pouces »)
        // dans un hook `pre('init')`, et `lean()` saute l'hydratation, donc ce
        // hook. Les fiches perdraient silencieusement ces valeurs.
        const requete = Model.find({});
        if (page.limit) requete.skip(page.skip).limit(page.limit);
        const [documents, total] = await Promise.all([
          requete,
          page.limit ? Model.countDocuments({}) : null,
        ]);
        // La reponse reste un tableau nu, avec ou sans pagination : le front
        // consomme directement `await response.json()`. Le total voyage en
        // en-tete pour ne pas changer cette forme.
        if (page.limit) res.set('X-Total-Count', String(total));
        res.json(documents);
      } catch (err) {
        fail(res, 500, `Erreur lors de la lecture des ${segment}.`, err);
      }
    });

    // Resume statistique de la collection, critere par critere.
    app.get(`/api/${segment}/marche`, async (_req, res) => {
      const champs = CHAMPS_MARCHE[segment] || [];
      if (champs.length === 0) {
        return res.status(404).json({ error: 'Resume indisponible pour cette collection.' });
      }
      try {
        const resume = await lectureMarche(segment, Model, champs);
        // Le cache serveur d'une heure suffit ; l'en-tete laisse aussi les
        // caches intermediaires (Render, navigateur) servir la meme reponse.
        res.set('Cache-Control', 'public, max-age=600');
        res.json(resume);
      } catch (err) {
        fail(res, 500, `Erreur lors du calcul du marche des ${segment}.`, err);
      }
    });

    // Une fiche repond a son slug comme a son identifiant Mongo. Les deux, et
    // pas seulement le slug : les URLs deja partagees ou indexees portent
    // l'identifiant, et les documents importes avant l'ajout du slug n'en ont
    // pas encore. Le jour ou une collection est rechargee, les adresses en
    // slug survivent — c'est tout l'interet du champ.
    app.get(`/api/${segment}/:id`, async (req, res) => {
      const cle = req.params.id;
      if (!estReference(cle)) {
        return res.status(400).json({ error: 'Identifiant invalide.' });
      }
      try {
        const doc = estIdentifiant(cle)
          ? await Model.findById(cle)
          : await Model.findOne({ slug: cle });
        if (!doc) return res.status(404).json({ error: `${label} non trouve.` });
        res.json(doc);
      } catch (err) {
        fail(res, 500, `Erreur lors de la lecture du ${label}.`, err);
      }
    });

    app.post(`/api/${segment}/compare`, async (req, res) => {
      const { ids } = req.body || {};
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "Un tableau d'IDs est requis." });
      }
      if (ids.length > 10) {
        return res.status(400).json({ error: 'Maximum 10 produits par comparaison.' });
      }
      /*
       * Slugs acceptes au meme titre que les identifiants Mongo, comme sur la
       * route d'une fiche : sans cela, un lien de comparaison partage ne
       * survivait pas au premier rechargement de la collection, l'adresse ne
       * portant que des `_id` reattribues a l'import.
       */
      const cles = ids.filter(cle => typeof cle === 'string');
      const identifiants = cles.filter(estIdentifiant);
      const slugs = cles.filter(cle => !estIdentifiant(cle) && SLUG_VALIDE.test(cle));

      if (identifiants.length === 0 && slugs.length === 0) {
        return res.status(400).json({ error: 'Aucun identifiant valide.' });
      }

      const conditions = [];
      if (identifiants.length > 0) conditions.push({ _id: { $in: identifiants } });
      if (slugs.length > 0) conditions.push({ slug: { $in: slugs } });

      try {
        res.json(await Model.find(conditions.length === 1 ? conditions[0] : { $or: conditions }));
      } catch (err) {
        fail(res, 500, 'Erreur lors de la comparaison.', err);
      }
    });

    /* ---------------- Routes protegees (ecriture) ---------------- */

    app.post(`/api/${segment}`, writeLimiter, requireAuth, async (req, res) => {
      const lot = Array.isArray(req.body);
      const fiches = lot ? req.body : [req.body];
      if (lot && fiches.length > 500) {
        return res.status(400).json({ error: 'Maximum 500 documents par insertion.' });
      }

      // Tout ou rien : un lot dont une fiche est refusee n'ecrit rien. Une
      // ecriture partielle laisserait la base dans un etat que personne n'a
      // demande, et obligerait a deviner quelles fiches sont passees.
      const erreurs = fiches.flatMap((fiche, i) =>
        controle(segment, fiche).map(motif =>
          lot ? `#${i + 1} (${nomDe(fiche)}) : ${motif}` : motif
        )
      );
      if (erreurs.length) return refuse(res, erreurs);

      try {
        if (lot) return res.status(201).json(await Model.insertMany(fiches));
        res.status(201).json(await new Model(fiches[0]).save());
      } catch (err) {
        fail(res, 400, `Creation du ${label} impossible.`, err);
      }
    });

    app.put(`/api/${segment}/:id`, writeLimiter, requireAuth, async (req, res) => {
      if (!estIdentifiant(req.params.id)) {
        return res.status(400).json({ error: 'Identifiant invalide.' });
      }
      try {
        const existant = await Model.findById(req.params.id);
        if (!existant) return res.status(404).json({ error: `${label} non trouve.` });

        // La modification est controlee sur la fiche COMPLETE qu'elle produira,
        // pas sur le seul corps recu : changer une valeur sans sa source, ou
        // retirer la source d'une valeur conservee, doit etre refuse.
        //
        // La provenance est fusionnee, pas remplacee : modifier une mesure
        // n'oblige pas a renvoyer la source de toutes les autres.
        const actuel = enObjet(existant);
        const maj = { ...(req.body || {}) };
        if (maj.provenance || actuel.provenance) {
          maj.provenance = { ...(actuel.provenance || {}), ...(maj.provenance || {}) };
        }
        const erreurs = controle(segment, { ...actuel, ...maj });
        if (erreurs.length) return refuse(res, erreurs);

        const updated = await Model.findByIdAndUpdate(req.params.id, maj, {
          new: true,
          runValidators: true,
        });
        if (!updated) return res.status(404).json({ error: `${label} non trouve.` });
        res.json(updated);
      } catch (err) {
        fail(res, 400, `Mise a jour du ${label} impossible.`, err);
      }
    });

    app.delete(`/api/${segment}/:id`, writeLimiter, requireAuth, async (req, res) => {
      if (!estIdentifiant(req.params.id)) {
        return res.status(400).json({ error: 'Identifiant invalide.' });
      }
      try {
        const deleted = await Model.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: `${label} non trouve.` });
        res.json({ message: `${label} supprime.` });
      } catch (err) {
        fail(res, 500, `Suppression du ${label} impossible.`, err);
      }
    });
  }
}

module.exports = { monteVedettes, monteCollections, creeLectureMarche };
