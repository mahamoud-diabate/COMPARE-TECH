'use strict';

/*
 * Construction de l'application Express, sans la demarrer.
 *
 * Separe de `server.js` (connexion a MongoDB, ecoute du port) pour que les
 * tests puissent monter l'API entiere avec de faux modeles et un faux service
 * d'IA, sans base ni reseau. Tout ce qui varie est injecte : configuration,
 * modeles, modele d'IA, etat de la base.
 *
 * L'ordre des `app.use` / `app.get` reproduit celui de l'ancien `server.js`
 * monolithique : il compte (CORS avant tout, 404 et gestion d'erreurs en
 * dernier, `/marche` avant `/:id`).
 */

const express = require('express');
const cors = require('cors');

const { construitListeBlanche, origineAutorisee } = require('./origines');
const { exigeAuthentification, rateLimit, stripMongoOperators, creeFail } = require('./securite');
const { monteAuth } = require('./routes/auth');
const { monteVedettes, monteCollections } = require('./routes/catalogue');
const { monteIa } = require('./routes/ia');

/**
 * @param {object} options
 * @param {object} options.config     resultat de `lireConfig` (config.js)
 * @param {object} options.modeles    { cpus, gpus, laptops, telephones } : modeles Mongoose
 * @param {object} options.User       modele des comptes admin
 * @param {object|null} [options.aiModel]  modele Gemini, ou null (route IA en 503)
 * @param {(segment: string, fiche: object) => string[]} options.controle
 *        controle d'une fiche avant ecriture (voir controles.js) ; renvoie les motifs de refus
 * @param {() => boolean} [options.baseConnectee]  etat de la connexion MongoDB
 * @returns {{app: import('express').Express, allowedOrigins: string[]}}
 */
function creeApp({ config, modeles, User, controle, aiModel = null, baseConnectee = () => false }) {
  const app = express();

  // Derriere le proxy Render, req.ip vaut sinon l'IP du proxy et non celle du
  // client : le rate limiting deviendrait global (tous les visiteurs
  // partageraient le meme quota). On fait confiance au premier saut.
  app.set('trust proxy', 1);

  /*
   * Liste blanche CORS. Les origines et la regle de decision vivent dans
   * `origines.js` — notamment la raison pour laquelle aucun motif n'est
   * applique sur *.vercel.app, ou un nom d'hote s'obtient au premier demandeur.
   */
  const allowedOrigins = construitListeBlanche({
    corsOrigins: config.corsOrigins,
    enProduction: config.enProduction,
  });

  app.use(
    cors({
      origin(origin, callback) {
        if (origineAutorisee(origin, allowedOrigins)) return callback(null, true);
        // Journalise la marche a suivre : une URL de previsualisation Vercel
        // change a chaque deploiement, et sans cette ligne le refus se lisait
        // seulement comme un echec reseau muet cote navigateur.
        console.warn(`CORS refuse : ${origin}. Ajoute-la a CORS_ORIGINS si elle est legitime.`);
        return callback(new Error(`Origine non autorisee : ${origin}`));
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'authorization'],
      // Sans cette ligne, X-Total-Count existe dans la reponse mais reste
      // invisible au JavaScript du navigateur : en cross-origin, seuls les
      // en-tetes explicitement exposes traversent.
      exposedHeaders: ['X-Total-Count'],
    })
  );

  // Limite la taille du corps : evite qu'un POST enorme sature la memoire.
  app.use(express.json({ limit: '100kb' }));

  app.use((req, _res, next) => {
    if (req.body) req.body = stripMongoOperators(req.body);
    next();
  });

  const fail = creeFail(config);
  const requireAuth = exigeAuthentification(config);

  const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: "Trop de requetes vers l'IA. Reessaie dans une heure.",
  });
  const writeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Trop d'ecritures. Reessaie plus tard.",
  });
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Trop de tentatives de connexion. Reessaie plus tard.',
  });

  /* ---------------- Routes publiques ---------------- */

  app.get('/', (_req, res) => {
    res.json({ status: 'ok', service: 'compare-tech-api' });
  });

  app.get('/api/health', (_req, res) => {
    const ok = baseConnectee();
    res.json({ status: ok ? 'ok' : 'degraded', db: ok ? 'connected' : 'disconnected' });
  });

  monteAuth(app, { User, config, loginLimiter, fail });
  monteVedettes(app, { modeles, fail });
  monteCollections(app, { modeles, fail, requireAuth, writeLimiter, controle });
  monteIa(app, { aiModel, aiLimiter, fail });

  /* ---------------- Fin de chaine ---------------- */

  app.use((_req, res) => res.status(404).json({ error: 'Route inconnue.' }));

  app.use((err, _req, res, _next) => {
    if (err && /Origine non autorisee/.test(err.message)) {
      return res.status(403).json({ error: 'Origine non autorisee.' });
    }
    fail(res, 500, 'Erreur serveur.', err);
  });

  return { app, allowedOrigins };
}

module.exports = { creeApp };
