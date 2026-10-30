'use strict';

/*
 * Connexion admin : verifie le couple nom d'utilisateur / mot de passe et
 * renvoie un JWT a duree limitee. Le compte admin est cree au demarrage a
 * partir de ADMIN_USERNAME / ADMIN_PASSWORD (voir server.js).
 */

const { verifyPassword, signToken } = require('../auth');

function monteAuth(app, { User, config, loginLimiter, fail }) {
  app.post('/api/auth/login', loginLimiter, async (req, res) => {
    if (!config.authConfiguree) {
      return res.status(503).json({ error: 'Authentification non configurée.' });
    }
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      return res.status(400).json({ error: "Nom d'utilisateur et mot de passe requis." });
    }
    try {
      const user = await User.findOne({ username });
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return res.status(401).json({ error: 'Identifiants invalides.' });
      }
      const token = signToken(
        { sub: user._id.toString(), username: user.username },
        config.jwtSecret
      );
      res.json({ token });
    } catch (err) {
      fail(res, 500, 'Erreur lors de la connexion.', err);
    }
  });
}

module.exports = { monteAuth };
