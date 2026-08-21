'use strict';

// Tests de `scripts/import.js` — la porte d'entree du catalogue.
//
// C'est le fichier le plus important de la chaine de donnees : c'est lui qui
// decide ce qui a le droit d'exister en base. Les fonctions testees ici sont
// pures, sans base ni reseau, pour que ce controle reste verifiable hors ligne.
const { test } = require('node:test');
const assert = require('node:assert');

const {
  champsMesures,
  cleNaturelle,
  valideProduit,
  valeurPresente,
  compareAuCatalogue,
  incoherencesDuLot,
} = require('../scripts/import');
const Cpu = require('../models/Cpu');

/** Produit minimal qui passe tous les gardes. */
const conforme = () => ({
  name: 'Exemple 9000',
  brand: 'Exemple',
  cores: 24,
  provenance: {
    cores: { url: 'https://exemple.invalid/fiche', releve_le: '2026-08-20', extrait: 'Total Cores 24' },
  },
});

// --- champs mesures ---------------------------------------------------------

test('champsMesures retient les champs numeriques du modele', () => {
  const champs = champsMesures(Cpu);
  assert.ok(champs.includes('cores'));
  assert.ok(champs.includes('geekbench_multi'));
  assert.ok(champs.includes('max_freq_ghz'));
});

test('champsMesures ignore le texte et la mecanique interne', () => {
  const champs = champsMesures(Cpu);
  assert.ok(!champs.includes('name'));
  assert.ok(!champs.includes('slug'));
  assert.ok(!champs.includes('__v'));
});

// --- cle de rapprochement ---------------------------------------------------

test('cleNaturelle ignore la casse et les espaces superflus', () => {
  const a = cleNaturelle({ brand: 'Intel', name: 'Core i9-14900K' });
  const b = cleNaturelle({ brand: ' intel ', name: 'core   i9-14900k' });
  assert.strictEqual(a, b);
});

test('cleNaturelle distingue deux marques portant le meme nom de modele', () => {
  const a = cleNaturelle({ brand: 'Intel', name: 'Arc A770' });
  const b = cleNaturelle({ brand: 'Asrock', name: 'Arc A770' });
  assert.notStrictEqual(a, b);
});

// --- garde 1 : provenance obligatoire ---------------------------------------

test('valideProduit accepte un produit conforme', () => {
  assert.deepStrictEqual(valideProduit(Cpu, conforme()), []);
});

test('valideProduit refuse une mesure sans provenance', () => {
  // Le garde central : un chiffre invente n'a pas d'URL.
  const produit = conforme();
  produit.geekbench_multi = 23500;
  const erreurs = valideProduit(Cpu, produit);
  assert.strictEqual(erreurs.length, 1);
  assert.match(erreurs[0], /geekbench_multi.*sans provenance/);
});

test('valideProduit refuse une provenance sans URL', () => {
  const produit = conforme();
  produit.provenance.cores = { releve_le: '2026-08-20', extrait: 'Total Cores 24' };
  assert.ok(valideProduit(Cpu, produit).some(e => /sans URL/.test(e)));
});

test('valideProduit refuse une provenance sans date', () => {
  const produit = conforme();
  produit.provenance.cores = { url: 'https://exemple.invalid/fiche', extrait: 'Total Cores 24' };
  assert.ok(valideProduit(Cpu, produit).some(e => /sans date/.test(e)));
});

test('valideProduit refuse une provenance sans extrait', () => {
  const produit = conforme();
  delete produit.provenance.cores.extrait;
  assert.ok(valideProduit(Cpu, produit).some(e => /sans extrait/.test(e)));
});

test('valideProduit refuse une valeur absente de son propre extrait', () => {
  // LE cas qui manquait. Une note de site comparatif prise pour un nombre de
  // coeurs : 91 figure bien sur la page, mais pas dans « Total Cores 24 ».
  // Ce controle ne demande aucune requete reseau.
  const produit = conforme();
  produit.cores = 91;
  assert.ok(valideProduit(Cpu, produit).some(e => /absent de son propre extrait/.test(e)));
});

test('valideProduit accepte une valeur ecrite autrement dans son extrait', () => {
  // L'extrait est recopie de la page : il peut porter un separateur de
  // milliers la ou la valeur est un nombre nu.
  const produit = conforme();
  produit.geekbench_multi = 23500;
  produit.provenance.geekbench_multi = {
    url: 'https://exemple.invalid/scores',
    releve_le: '2026-08-20',
    extrait: 'Multi-Core Score 23,500',
  };
  assert.deepStrictEqual(valideProduit(Cpu, produit), []);
});

test('valideProduit refuse une date illisible', () => {
  const produit = conforme();
  produit.provenance.cores.releve_le = 'la semaine derniere';
  assert.ok(valideProduit(Cpu, produit).some(e => /date de releve illisible/.test(e)));
});

test('valideProduit n exige pas de provenance pour une mesure absente', () => {
  // Une valeur nulle n'affirme rien : elle n'a rien a prouver.
  const produit = conforme();
  produit.geekbench_multi = null;
  assert.deepStrictEqual(valideProduit(Cpu, produit), []);
});

test('valideProduit exige un nom et une marque', () => {
  const erreurs = valideProduit(Cpu, { cores: 8 });
  assert.ok(erreurs.some(e => /nom absent/.test(e)));
  assert.ok(erreurs.some(e => /marque absente/.test(e)));
});

// --- garde 2 : plages de validite -------------------------------------------

test('valideProduit refuse une valeur hors de la plage declaree au modele', () => {
  const produit = conforme();
  produit.max_freq_ghz = 570;
  produit.provenance.max_freq_ghz = {
    url: 'https://exemple.invalid/f', releve_le: '2026-08-20', extrait: 'Max Frequency 570 GHz',
  };
  assert.ok(valideProduit(Cpu, produit).some(e => /max_freq_ghz/.test(e)));
});

// --- garde 3 : controle litteral --------------------------------------------

test('valeurPresente trouve la valeur ecrite telle quelle', () => {
  assert.strictEqual(valeurPresente('Multi-Core Score 23500 points', 23500), true);
});

test('valeurPresente accepte les separateurs de milliers usuels', () => {
  // Une meme mesure s'ecrit « 23,500 » ici et « 23 500 » ailleurs.
  assert.strictEqual(valeurPresente('Score: 23,500', 23500), true);
  assert.strictEqual(valeurPresente('Score: 23 500', 23500), true);
  assert.strictEqual(valeurPresente('Score: 23.500', 23500), true);
});

test('valeurPresente accepte la virgule decimale', () => {
  assert.strictEqual(valeurPresente('Frequence max 6,0 GHz', 6.0), true);
  assert.strictEqual(valeurPresente('Diagonale 6,7 pouces', 6.7), true);
});

test('valeurPresente refuse une valeur absente de la page', () => {
  // Le cas qui compte : un chiffre restitue de memoire par une IA ne se
  // trouve pas sur la page qu'elle cite.
  assert.strictEqual(valeurPresente('Multi-Core Score 23500 points', 23517), false);
});

test('valeurPresente n est pas trompee par un nombre plus long', () => {
  assert.strictEqual(valeurPresente('reference 235009', 23500), false);
});

// --- garde 4 : diff et quarantaine ------------------------------------------

const existant = { _id: '1', name: 'Exemple 9000', brand: 'Exemple', cores: 24, geekbench_multi: 20000 };

test('compareAuCatalogue signale un produit absent de la base comme creation', () => {
  const neuf = { name: 'Inedit 1', brand: 'Exemple', cores: 8 };
  const bilan = compareAuCatalogue(Cpu, [neuf], [existant]);
  assert.strictEqual(bilan.creations.length, 1);
  assert.strictEqual(bilan.majs.length, 0);
});

test('compareAuCatalogue applique une variation sous le seuil', () => {
  const produit = { name: 'Exemple 9000', brand: 'Exemple', geekbench_multi: 20800 };  // +4 %
  const bilan = compareAuCatalogue(Cpu, [produit], [existant], 10);
  assert.strictEqual(bilan.majs.length, 1);
  assert.strictEqual(bilan.quarantaine.length, 0);
  assert.deepStrictEqual(bilan.majs[0].changements[0], {
    champ: 'geekbench_multi', vieux: 20000, neuf: 20800,
  });
});

test('compareAuCatalogue met en quarantaine une variation au-dessus du seuil', () => {
  // Un processeur ne gagne pas 50 % de performance pendant la nuit : c'est le
  // releve qui a derape, et il ne doit pas atteindre la production.
  const produit = { name: 'Exemple 9000', brand: 'Exemple', geekbench_multi: 30000 };
  const bilan = compareAuCatalogue(Cpu, [produit], [existant], 10);
  assert.strictEqual(bilan.quarantaine.length, 1);
  assert.strictEqual(bilan.majs.length, 0);
  assert.strictEqual(bilan.quarantaine[0].suspects[0].ecart, 50);
});

test('compareAuCatalogue ne signale rien quand la valeur est inchangee', () => {
  const produit = { name: 'Exemple 9000', brand: 'Exemple', geekbench_multi: 20000 };
  const bilan = compareAuCatalogue(Cpu, [produit], [existant], 10);
  assert.strictEqual(bilan.majs.length, 0);
  assert.strictEqual(bilan.quarantaine.length, 0);
});

test('compareAuCatalogue traite un champ jusqu ici vide comme un ajout, pas comme un ecart', () => {
  // Sans cette regle, completer une fiche declencherait la quarantaine a
  // chaque fois — le seuil relatif n'a pas de sens face a une case vide.
  const produit = { name: 'Exemple 9000', brand: 'Exemple', max_freq_ghz: 6 };
  const bilan = compareAuCatalogue(Cpu, [produit], [existant], 10);
  assert.strictEqual(bilan.quarantaine.length, 0);
  assert.strictEqual(bilan.majs[0].changements[0].champ, 'max_freq_ghz');
});

test('compareAuCatalogue rapproche les produits malgre la casse', () => {
  const produit = { name: 'EXEMPLE 9000', brand: 'exemple', geekbench_multi: 20500 };
  const bilan = compareAuCatalogue(Cpu, [produit], [existant], 10);
  assert.strictEqual(bilan.creations.length, 0);
  assert.strictEqual(bilan.majs.length, 1);
});

// --- garde 5 : coherence du lot -------------------------------------------

/** Un lot de n produits portant les valeurs donnees sur un champ. */
const lot = (champ, valeurs) => valeurs.map((v, i) => ({
  name: `Essai ${i}`, brand: 'Essai', [champ]: v,
}));

test('incoherencesDuLot signale la valeur qui detonne dans le lot', () => {
  // Le cas reel : une note de site comparatif (91) prise pour un nombre de
  // coeurs, au milieu de vrais decomptes. Aucun autre garde ne la voit.
  const signalements = incoherencesDuLot(Cpu, lot('cores', [24, 20, 16, 24, 8, 12, 91]));
  assert.strictEqual(signalements.length, 1);
  assert.strictEqual(signalements[0].valeur, 91);
  assert.strictEqual(signalements[0].champ, 'cores');
  assert.strictEqual(signalements[0].mediane, 20);
});

test('incoherencesDuLot laisse passer un lot homogene', () => {
  assert.deepStrictEqual(incoherencesDuLot(Cpu, lot('cores', [24, 20, 16, 24, 8, 12])), []);
});

test('incoherencesDuLot signale aussi une valeur anormalement basse', () => {
  // Un 2 au milieu de processeurs a 16 coeurs merite le meme coup d oeil.
  const signalements = incoherencesDuLot(Cpu, lot('cores', [24, 20, 16, 24, 16, 2]));
  assert.strictEqual(signalements.length, 1);
  assert.strictEqual(signalements[0].valeur, 2);
});

test('incoherencesDuLot se tait en dessous de cinq releves', () => {
  // Avec quatre valeurs, un ecart n est pas une anomalie : c est l echantillon.
  assert.deepStrictEqual(incoherencesDuLot(Cpu, lot('cores', [24, 8, 91, 16])), []);
});

test('incoherencesDuLot ignore les produits sans valeur sur le champ', () => {
  const produits = lot('cores', [24, 20, 16, 24, 8, 12]);
  produits.push({ name: 'Sans coeurs', brand: 'Essai' });
  assert.deepStrictEqual(incoherencesDuLot(Cpu, produits), []);
});

test('incoherencesDuLot respecte le facteur demande', () => {
  // Mediane 20. Le 60 vaut trois fois la mediane, le 8 en vaut le quart.
  // A facteur 4, les deux passent ; a facteur 2, les deux sont signales —
  // resserrer le facteur eleve la sensibilite dans les deux sens.
  const valeurs = [24, 20, 16, 24, 8, 12, 60];
  assert.strictEqual(incoherencesDuLot(Cpu, lot('cores', valeurs), 4).length, 0);

  const serre = incoherencesDuLot(Cpu, lot('cores', valeurs), 2);
  assert.deepStrictEqual(serre.map(s => s.valeur).sort((a, b) => a - b), [8, 60]);
});

test('incoherencesDuLot examine chaque champ separement', () => {
  const produits = lot('cores', [24, 20, 16, 24, 8, 12]);
  produits.forEach((p, i) => { p.geekbench_multi = [20000, 21000, 19000, 22000, 20500, 120000][i]; });
  const signalements = incoherencesDuLot(Cpu, produits);
  assert.strictEqual(signalements.length, 1);
  assert.strictEqual(signalements[0].champ, 'geekbench_multi');
});

// --- champs inconnus du modele ---------------------------------------------

test('valideProduit refuse un champ que le modele ne connait pas', () => {
  // Mongoose supprime les champs hors schema sans rien dire. Un fichier de
  // scores Geekbench destine aux telephones serait accepte, ecrit, et ne
  // laisserait que le nom en base. Perdre une donnee en silence est pire que
  // la refuser.
  const produit = conforme();
  produit.antutu_score = 1750331;
  const erreurs = valideProduit(Cpu, produit);
  assert.ok(erreurs.some(e => /antutu_score : champ inconnu/.test(e)));
});

test('valideProduit accepte les champs du modele et la provenance', () => {
  const produit = conforme();
  produit.threads = 32;
  produit.provenance.threads = {
    url: 'https://exemple.invalid/fiche', releve_le: '2026-08-20', extrait: 'Total Threads 32',
  };
  produit.imageUrl = 'https://exemple.invalid/image.png';
  produit.pros = ['rapide'];
  assert.deepStrictEqual(valideProduit(Cpu, produit), []);
});
