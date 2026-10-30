'use strict';

/*
 * Middlewares de securite et reponse d'erreur commune.
 *
 * Sortis de `server.js` pour etre partages par les fichiers de `routes/` et
 * testes sans demarrer de serveur ni de base.
 */

const { verifyToken } = require('./auth');

/**
 * Exige un en-tete « Authorization: Bearer <jeton> » valide.
 * Sans configuration d'authentification, repond 503 : une API mal configuree
 * refuse les ecritures, elle ne les ouvre pas.
 */
function exigeAuthentification(config) {
  return function requireAuth(req, res, next) {
    if (!config.authConfiguree) {
      return res.status(503).json({ error: 'Authentification non configurée.' });
    }
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const payload = token ? verifyToken(token, config.jwtSecret) : null;
    if (!payload) {
      return res.status(401).json({ error: 'Jeton invalide ou expiré.' });
    }
    req.auth = payload;
    next();
  };
}

/**
 * Limiteur de debit en memoire (suffisant pour une instance unique ; passer a
 * Redis si l'API est repliquee un jour).
 *
 * La cle est `req.ip` : derriere le proxy Render, elle ne vaut l'IP du client
 * que si `trust proxy` est regle (voir app.js).
 */
function rateLimit({ windowMs, max, message }) {
  const hits = new Map();

  // Purge periodique des entrees expirees : sans cela, la Map grossirait
  // indefiniment (une entree par IP, jamais supprimee).
  const purgeTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now > entry.reset) hits.delete(key);
    }
  }, windowMs);
  if (typeof purgeTimer.unref === 'function') purgeTimer.unref();

  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || now > entry.reset) {
      hits.set(key, { count: 1, reset: now + windowMs });
      return next();
    }
    if (entry.count >= max) {
      const retry = Math.ceil((entry.reset - now) / 1000);
      res.set('Retry-After', String(retry));
      return res.status(429).json({ error: message, retryAfterSeconds: retry });
    }
    entry.count++;
    next();
  };
}

/** Empeche l'injection d'operateurs Mongo ($gt, $ne...) via le corps JSON. */
function stripMongoOperators(value) {
  if (Array.isArray(value)) return value.map(stripMongoOperators);
  if (value && typeof value === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith('$') || k.includes('.')) continue;
      clean[k] = stripMongoOperators(v);
    }
    return clean;
  }
  return value;
}

/**
 * Reponse d'erreur. N'expose jamais le message brut en production : il peut
 * reveler la structure de la base ou des chemins internes.
 */
function creeFail(config) {
  return function fail(res, status, publicMessage, err) {
    if (err) console.error(publicMessage, err);
    const body = { error: publicMessage };
    if (!config.enProduction && err) body.details = err.message;
    return res.status(status).json(body);
  };
}

module.exports = { exigeAuthentification, rateLimit, stripMongoOperators, creeFail };
