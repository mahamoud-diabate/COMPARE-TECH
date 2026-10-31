'use strict';

/*
 * Lecture de la configuration.
 *
 * Fonction pure : elle recoit l'environnement et renvoie une configuration
 * plus la liste des avertissements, sans rien afficher ni quitter. C'est
 * `server.js` qui decide quoi en faire au demarrage, et les tests peuvent
 * fabriquer une configuration sans toucher a `process.env`.
 */

// Modele par defaut. Il doit rester un modele servi : gemini-2.0-flash, l'ancien
// defaut, a ete arrete par Google le 1er juin 2026, et gemini-1.5-flash avant
// lui. Un defaut mort fait echouer la route IA sur une installation neuve, sans
// que rien dans la configuration ne l'annonce. Verifier avant de changer :
// https://ai.google.dev/gemini-api/docs/deprecations
const MODELE_IA_DEFAUT = 'gemini-3.8-flash';

// Modele DeepSeek par defaut. `deepseek-flash` est le nom recommande par la
// documentation DeepSeek (servi par DeepSeek-V4.1-Flash) ; `deepseek-v4-pro`
// coute plus cher pour une phrase de verdict, sans gain utile ici. L'ancien
// nom `deepseek-chat` n'est plus servi : un defaut mort ferait echouer la route
// IA sur une installation neuve, sans que rien ne l'annonce.
// https://api-docs.deepseek.com/
const MODELE_DEEPSEEK_DEFAUT = 'deepseek-flash';

/**
 * @param {Record<string, string|undefined>} env  en pratique `process.env`
 * @returns {{config: object, avertissements: string[]}}
 */
function lireConfig(env = {}) {
  const config = {
    dbUri: env.DB_URI || '',
    jwtSecret: env.JWT_SECRET || '',
    adminUsername: env.ADMIN_USERNAME || 'admin',
    adminPassword: env.ADMIN_PASSWORD || '',
    geminiApiKey: env.GEMINI_API_KEY || '',
    geminiModel: env.GEMINI_MODEL || MODELE_IA_DEFAUT,
    deepseekApiKey: env.DEEPSEEK_API_KEY || '',
    deepseekModel: env.DEEPSEEK_MODEL || MODELE_DEEPSEEK_DEFAUT,
    corsOrigins: env.CORS_ORIGINS || '',
    enProduction: env.NODE_ENV === 'production',
    port: env.PORT || 3001,
  };

  // Sans mot de passe admin ni secret JWT, les routes d'ecriture sont
  // desactivees plutot qu'ouvertes : un oubli de configuration ne doit jamais
  // aboutir a une API sans protection.
  config.authConfiguree = Boolean(config.jwtSecret && config.adminPassword);

  const avertissements = [];
  if (!config.adminPassword) {
    avertissements.push(
      'ADMIN_PASSWORD absente : connexion admin désactivée, écritures refusées (503).'
    );
  } else if (config.adminPassword.length < 10) {
    avertissements.push('ADMIN_PASSWORD courte : utilise au moins 10 caractères.');
  }
  if (!config.jwtSecret || config.jwtSecret.length < 32) {
    avertissements.push(
      'JWT_SECRET absente ou trop courte : génère-en une (48+ caractères hex) et définis-la.'
    );
  }
  if (!config.geminiApiKey && !config.deepseekApiKey) {
    avertissements.push(
      'Ni GEMINI_API_KEY ni DEEPSEEK_API_KEY : la route /api/ai/verdict renverra 503.'
    );
  }

  return { config, avertissements };
}

module.exports = { lireConfig, MODELE_IA_DEFAUT, MODELE_DEEPSEEK_DEFAUT };
