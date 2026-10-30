/*
 * Contrôles de provenance : une mesure est-elle prouvée par sa source ?
 *
 * Partagés par l'importateur (`backend/scripts/import.js`), l'API (routes
 * d'écriture) et le formulaire d'administration, qui affiche le résultat
 * pendant la saisie. Une seule définition de « prouvé », donc un seul verdict
 * quel que soit le chemin d'entrée de la donnée.
 *
 * Fonctions pures : aucun accès réseau. Le contrôle en ligne (l'extrait
 * figure-t-il sur la page ?) reste dans l'importateur, seul à télécharger.
 */

/**
 * Compare deux textes en ignorant TOUTE espace.
 *
 * L'extraction HTML colle les cellules voisines : Notebookcheck rend
 * « Memory128 GB » la ou l'oeil lit « Memory 128 GB ». Exiger l'espacement
 * exact testerait la qualite de l'extracteur, pas l'honnetete du releveur.
 */
export function memeTexte(page, extrait) {
  const compacte = t => normaliseTexte(t).replace(/\s+/g, '');
  return compacte(page).includes(compacte(extrait));
}

/** Reduit un texte de page a une forme comparable : minuscules, espaces normalises. */
export function normaliseTexte(texte) {
  return String(texte || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Une duree ecrite « 19h 19min » vaut-elle `valeur` heures ?
 *
 * Notebookcheck publie ses autonomies en heures et minutes ; le modele les
 * stocke en heures decimales. Interdire la conversion rendrait le champ
 * incollectable ; l'accepter sur parole viderait le controle de son sens.
 *
 * La sortie choisie : le garde REFAIT le calcul. Il ne croit pas la conversion,
 * il la verifie. La tolerance couvre l'arrondi a deux decimales, rien de plus.
 */
export function dureeConcordante(texte, valeur) {
  const motif = /(\d+)\s*h\s*(\d+)\s*min/gi;
  let m;
  while ((m = motif.exec(texte)) !== null) {
    const heures = parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
    if (Math.abs(heures - valeur) <= 0.01) return true;
  }
  return false;
}

export function valeurPresente(textePage, valeur) {
  const texte = normaliseTexte(textePage);
  const brut = String(valeur);
  const graphies = new Set([brut]);

  // Une fiche technique ecrit volontiers « 6.0 GHz » la ou la valeur vaut 6.
  if (Number.isInteger(valeur)) graphies.add(brut + '.0').add(brut + ',0');

  if (Number.isInteger(valeur) && Math.abs(valeur) >= 1000) {
    const avec = sep => brut.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    graphies.add(avec(',')).add(avec(' ')).add(avec('.'));
  }
  if (!Number.isInteger(valeur)) graphies.add(brut.replace('.', ','));

  const trouve = [...graphies].some(graphie => {
    const motif = graphie.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Le nombre doit etre ISOLE dans la page. Sans ces bornes, un simple
    // `includes` validerait la valeur 23500 sur une page qui ne contient que
    // « 235009 », et la valeur 6 sur une page qui dit « 6.7 » — le controle
    // dirait alors oui a peu pres a n'importe quoi.
    const borne = new RegExp('(?<![\\d.,])' + motif + '(?![\\d])(?![.,]\\d)');
    return borne.test(texte);
  });

  return trouve || dureeConcordante(texte, valeur);
}

/**
 * Contrôle la provenance de chaque mesure renseignée d'un produit.
 *
 * Exige, pour toute valeur non vide : une URL, une date de relevé lisible, et
 * un extrait qui CONTIENT la valeur. Ce dernier point rattache le nombre à son
 * libellé : 91 peut se trouver quelque part sur une page, il ne peut pas se
 * trouver dans « Total Cores 24 ».
 *
 * @param {string[]} champs  les champs qui sont des mesures
 * @param {object} produit   le document, avec son objet `provenance`
 * @returns {string[]} les motifs de refus, vide si tout est prouvé
 */
export function controleProvenance(champs, produit) {
  const erreurs = [];
  const provenance = (produit && produit.provenance) || {};
  for (const champ of champs) {
    const valeur = produit[champ];
    if (valeur === undefined || valeur === null || valeur === '') continue;

    const source = provenance[champ];
    if (!source) {
      erreurs.push(`${champ} = ${valeur} sans provenance : d'ou vient ce chiffre ?`);
      continue;
    }
    if (!source.url) erreurs.push(`${champ} : provenance sans URL`);
    if (!source.releve_le) erreurs.push(`${champ} : provenance sans date de releve`);
    else if (Number.isNaN(Date.parse(source.releve_le))) {
      erreurs.push(`${champ} : date de releve illisible (« ${source.releve_le} »)`);
    }

    // L'extrait rattache le nombre a son libelle, et c'est ce qui manquait au
    // dispositif. Verifier que 91 figure quelque part sur une page ne prouve
    // rien ; verifier que 91 figure dans « Total Cores 24 » est impossible.
    // Ce controle ne coute aucune requete : il se fait sur le fichier seul.
    if (!source.extrait) {
      erreurs.push(`${champ} : provenance sans extrait — il faut la ligne qui prouve la valeur`);
    } else if (!valeurPresente(source.extrait, valeur)) {
      erreurs.push(
        `${champ} = ${valeur} absent de son propre extrait (« ${source.extrait} ») : ` +
          `le nombre et le libelle ne se rapportent pas a la meme chose`
      );
    }
  }

  return erreurs;
}
