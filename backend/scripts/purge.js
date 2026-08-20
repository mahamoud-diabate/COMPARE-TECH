const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ quiet: true });

const Cpu = require('../models/Cpu');
const Gpu = require('../models/Gpu');
const Laptop = require('../models/Laptop');
const Telephone = require('../models/Telephone');

/*
 * Vidage des collections de produits.
 *
 * Les quatre collections seulement : la collection `users` porte le compte
 * administrateur, l'effacer reviendrait a se fermer la porte du back-office.
 *
 * Trois garde-fous, parce qu'une suppression en base distante ne se rejoue
 * pas :
 *  1. sauvegarde JSON automatique avant tout effacement (--no-backup pour
 *     s'en passer, deconseille) ;
 *  2. rien n'est supprime sans --yes : une execution nue se contente de
 *     compter, ce qui rend --dry-run implicite ;
 *  3. la connexion echoue proprement si DB_URI est absente, au lieu de
 *     laisser mongoose expirer au bout de trente secondes.
 *
 * Usage :
 *   node scripts/purge.js                 # compte, ne supprime rien
 *   node scripts/purge.js --yes           # sauvegarde puis vide tout
 *   node scripts/purge.js --yes --only=cpus,gpus
 *   node scripts/purge.js --yes --no-backup
 */

const COLLECTIONS = { cpus: Cpu, gpus: Gpu, laptops: Laptop, telephones: Telephone };

const args = process.argv.slice(2);
const has = flag => args.includes(flag);
const confirmed = has('--yes');
const withBackup = !has('--no-backup');

const onlyArg = args.find(a => a.startsWith('--only='));
const selected = onlyArg
  ? onlyArg.slice('--only='.length).split(',').map(s => s.trim()).filter(Boolean)
  : Object.keys(COLLECTIONS);

const unknown = selected.filter(name => !COLLECTIONS[name]);
if (unknown.length > 0) {
  console.error(`Collection inconnue : ${unknown.join(', ')}`);
  console.error(`Valeurs acceptees : ${Object.keys(COLLECTIONS).join(', ')}`);
  process.exit(1);
}

async function main() {
  if (!process.env.DB_URI) {
    console.error('DB_URI absente. Copie backend/.env.example vers backend/.env et renseigne-la.');
    process.exit(1);
  }

  await mongoose.connect(process.env.DB_URI, { serverSelectionTimeoutMS: 15000 });

  const host = mongoose.connection.host;
  const dbName = mongoose.connection.name;
  console.log(`Base : ${dbName} sur ${host}`);
  console.log(`Collections visees : ${selected.join(', ')}\n`);

  const counts = {};
  for (const name of selected) {
    counts[name] = await COLLECTIONS[name].countDocuments();
    console.log(`  ${name.padEnd(12)} ${String(counts[name]).padStart(5)} document(s)`);
  }

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  console.log(`\n  ${'total'.padEnd(12)} ${String(total).padStart(5)} document(s)`);

  if (total === 0) {
    console.log('\nRien a supprimer.');
    return;
  }

  if (!confirmed) {
    console.log('\nAucune suppression effectuee (mode par defaut).');
    console.log('Relance avec --yes pour vider ces collections.');
    return;
  }

  if (withBackup) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dir = path.join(__dirname, '..', 'backup', stamp);
    fs.mkdirSync(dir, { recursive: true });

    for (const name of selected) {
      const docs = await COLLECTIONS[name].find().lean();
      fs.writeFileSync(
        path.join(dir, `${name}.json`),
        JSON.stringify(docs, null, 2),
        'utf8'
      );
    }
    console.log(`\nSauvegarde ecrite dans backup/${stamp}/`);
  } else {
    console.log('\nSauvegarde ignoree (--no-backup).');
  }

  console.log('');
  for (const name of selected) {
    const { deletedCount } = await COLLECTIONS[name].deleteMany({});
    console.log(`  ${name.padEnd(12)} ${String(deletedCount).padStart(5)} supprime(s)`);
  }

  console.log('\nTermine. La collection users (compte admin) n a pas ete touchee.');
}

main()
  .catch(err => {
    console.error('Echec :', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.close());
