// Le .env vit a la racine du backend, quel que soit le dossier depuis lequel
// on lance la commande. Sans ce chemin explicite, dotenv le cherche dans le
// dossier courant : lance depuis la racine du depot, il ne trouve rien et
// echoue en annoncant une variable absente qui est pourtant bien la.
require('dotenv').config({ path: require('node:path').join(__dirname, '.env') });

/*
 * Demarrage de l'API : lecture de la configuration, connexion a MongoDB,
 * creation du compte admin, ecoute du port.
 *
 * Les routes et les middlewares sont dans `app.js` et `routes/`. Ce fichier ne
 * fait que relier l'application aux vraies dependances (base, Gemini).
 */

const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const Cpu = require('./models/Cpu');
const Gpu = require('./models/Gpu');
const Laptop = require('./models/Laptop');
const Telephone = require('./models/Telephone');
const User = require('./models/User');
const { hashPassword } = require('./auth');
const { lireConfig } = require('./config');
const { creeApp } = require('./app');
const { creeModeleDeepseek } = require('./ia-deepseek');
const { valideProduit } = require('./controles');

const { config, avertissements } = lireConfig(process.env);

if (!config.dbUri) {
  console.error('DB_URI manquante. Copie .env.example vers .env et renseigne-la.');
  process.exit(1);
}
for (const avertissement of avertissements) console.warn(avertissement);

// Fournisseur d'IA : Gemini si sa cle est la, sinon DeepSeek, sinon aucun
// (la route repond alors 503 et le site affiche le verdict calcule seul).
// Les deux exposent la meme interface, donc `routes/ia.js` les traite a
// l'identique : memes garde-fous, meme cache, meme 502 en cas de panne.
const aiModel = config.geminiApiKey
  ? new GoogleGenerativeAI(config.geminiApiKey).getGenerativeModel({ model: config.geminiModel })
  : config.deepseekApiKey
    ? creeModeleDeepseek({ apiKey: config.deepseekApiKey, model: config.deepseekModel })
    : null;

const modeles = { cpus: Cpu, gpus: Gpu, laptops: Laptop, telephones: Telephone };

const { app, allowedOrigins } = creeApp({
  config,
  modeles,
  User,
  // Memes regles que l'importateur : provenance prouvee, champs connus, plages.
  controle: (segment, fiche) => valideProduit(modeles[segment], fiche),
  aiModel,
  baseConnectee: () => mongoose.connection.readyState === 1,
});

mongoose
  .connect(config.dbUri)
  .then(async () => {
    console.log('Connecte a MongoDB.');

    // Cree (ou met a jour) le compte admin a partir des variables
    // d'environnement : le mot de passe est hache (scrypt) avant stockage.
    if (config.adminUsername && config.adminPassword) {
      try {
        const passwordHash = await hashPassword(config.adminPassword);
        await User.findOneAndUpdate(
          { username: config.adminUsername },
          { username: config.adminUsername, passwordHash },
          { upsert: true, new: true }
        );
        console.log(`Compte admin "${config.adminUsername}" pret.`);
      } catch (err) {
        console.error('Initialisation du compte admin impossible :', err.message);
      }
    }

    app.listen(config.port, () => {
      console.log(`Serveur demarre sur http://localhost:${config.port}`);
      console.log(`Origines autorisees : ${allowedOrigins.join(', ') || '(aucune)'}`);
    });
  })
  .catch(err => {
    console.error('Connexion a MongoDB impossible :', err.message);
    process.exit(1);
  });
