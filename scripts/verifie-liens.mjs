/*
 * Verifie que chaque lien Markdown relatif d'un fichier suivi pointe sur un
 * fichier qui existe.
 *
 * Pourquoi un script : deplacer un document ou en supprimer un ne casse rien
 * de visible. Le lien reste, il ne mene plus nulle part, et personne ne s'en
 * apercoit avant de cliquer. Ce controle a deja rattrape deux cas — un renvoi
 * vers un README remonte d'un niveau, et une consigne supprimee par
 * inadvertance dont le pointeur etait reste.
 *
 * Aucune dependance : `git ls-files` donne la liste des fichiers suivis, le
 * reste tient dans les modules natifs.
 *
 *   node scripts/verifie-liens.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Liens Markdown `[texte](cible)`. Les cibles absolues (http, mailto) et les
// ancres pures (#section) sortent du perimetre : seul le systeme de fichiers
// est verifiable ici.
const LIEN = /\[[^\]]*\]\(([^)\s]+)/g;
const EXTERNE = /^(https?:|mailto:|tel:|#)/;

const fichiers = execFileSync('git', ['ls-files', '*.md'], {
  cwd: RACINE,
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean);

const casses = [];
let verifies = 0;

for (const fichier of fichiers) {
  const texte = readFileSync(join(RACINE, fichier), 'utf8');

  for (const [, brut] of texte.matchAll(LIEN)) {
    if (EXTERNE.test(brut)) continue;

    // Une ancre en fin de cible designe une section du fichier, pas un autre
    // fichier : on ne garde que la partie chemin.
    const cible = brut.split('#')[0];
    if (!cible) continue;

    verifies += 1;
    if (!existsSync(resolve(dirname(join(RACINE, fichier)), cible))) {
      casses.push(`${fichier} → ${brut}`);
    }
  }
}

if (casses.length) {
  console.error(`Liens casses (${casses.length}) :`);
  for (const casse of casses) console.error(`  ${casse}`);
  process.exit(1);
}

console.log(`${verifies} liens relatifs verifies dans ${fichiers.length} fichiers, aucun casse.`);
