/*
 * Remplace une catégorie entière du catalogue par un fichier vérifié, en une
 * seule commande.
 *
 *   node scripts/remplace-catalogue.js data/laptops.json
 *
 * Enchaîne trois étapes déjà existantes, et s'arrête à la première qui échoue :
 *   1. essai : `import.js <fichier> --verifier`, sans écriture. Chaque extrait
 *      est cherché sur sa page ; un seul introuvable arrête tout, et la base
 *      n'a pas été touchée ;
 *   2. vidage : `purge.js --only=<type> --yes`, qui SAUVEGARDE d'abord la
 *      catégorie dans backend/backup/ ;
 *   3. import : `import.js <fichier> --verifier --ecrire`.
 *
 * Pourquoi vider plutôt que mettre à jour : en mise à jour, import.js n'écrit
 * que les nombres qui changent. Un champ texte (socket) ou la qualification
 * d'une valeur inchangée (origine, protocole) ne serait jamais enregistré.
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const TYPES = ['cpus', 'gpus', 'laptops', 'telephones'];

/** Le type déclaré par le fichier d'import, ou une erreur explicite. */
function typeDuFichier(chemin) {
  const contenu = JSON.parse(fs.readFileSync(chemin, 'utf8'));
  if (!TYPES.includes(contenu.type)) {
    throw new Error(`type « ${contenu.type} » inconnu : attendu ${TYPES.join(', ')}.`);
  }
  return contenu.type;
}

function lance(script, args) {
  const resultat = spawnSync(process.execPath, [path.join(__dirname, script), ...args], {
    stdio: 'inherit',
  });
  return resultat.status === 0;
}

function main() {
  const chemin = process.argv[2];
  if (!chemin) {
    console.error('Usage : node scripts/remplace-catalogue.js data/<fichier>.json');
    process.exit(1);
  }
  const type = typeDuFichier(chemin);

  console.log(`\n=== 1/3 Essai de ${chemin} (rien n'est écrit)`);
  if (!lance('import.js', [chemin, '--verifier'])) {
    console.error("\nArrêt : l'essai a échoué. La base n'a pas été modifiée.");
    process.exit(1);
  }

  console.log(`\n=== 2/3 Sauvegarde puis vidage de « ${type} »`);
  if (!lance('purge.js', [`--only=${type}`, '--yes'])) {
    console.error('\nArrêt : le vidage a échoué. Vérifiez la base avant de relancer.');
    process.exit(1);
  }

  console.log(`\n=== 3/3 Import de ${chemin}`);
  if (!lance('import.js', [chemin, '--verifier', '--ecrire'])) {
    console.error(
      `\nATTENTION : la catégorie « ${type} » a été vidée mais l'import a échoué.\n` +
        `La sauvegarde est dans backend/backup/ (dossier le plus récent).`
    );
    process.exit(1);
  }

  console.log(`\nTerminé : « ${type} » remplacé par ${chemin}.`);
}

if (require.main === module) main();

module.exports = { typeDuFichier };
