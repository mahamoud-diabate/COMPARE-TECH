/*
 * Situer un produit « dans le marché » : rang, mot de lecture et tracé de
 * chaque critère parmi tous les produits de sa catégorie.
 *
 * Pourquoi un module à part : la page comparative ne se contente plus
 * d'opposer deux fiches, elle les place parmi tout le catalogue. Ces calculs
 * sont purs (aucun DOM, aucun réseau) pour être testés sans navigateur, comme
 * `specs.js` et `scores.js`.
 *
 * Règles de lecture, fixées avec le propriétaire du site :
 *  - un seul langage de classement, le rang (« 4e sur 15 »), suivi d'un mot
 *    en français courant ; au-delà de 100 produits, « Top X % » ;
 *  - aucun vocabulaire statistique à l'écran (ni médiane, ni centile) ;
 *  - plus à droite = meilleur, y compris pour une mesure où le plus petit
 *    gagne (consommation) : l'axe est retourné, pas la donnée.
 */

import { SPEC_GROUPS, resolveType, toNumber } from './specs.js';
import { MAX_PALIERS, NB_BACS, SEUIL_BORNAGE, quantile } from '../../../shared/marche.js';
import { ORIGINES, libelleProtocole } from '../../../shared/criteres.js';

/*
 * Les seuils de découpage sont ceux du résumé serveur (`shared/marche.js`) :
 * client et serveur tracent une même mesure de la même façon.
 *
 *  - au-delà de 40 valeurs, des points individuels se chevauchent sur une
 *    piste de 300 px : on passe à des colonnes qui comptent les produits ;
 *  - jusqu'à 12 valeurs distinctes, une mesure est lue par paliers réels
 *    (cœurs, mémoire) : un histogramme y inventerait des positions qui
 *    n'existent pas.
 */
export const SEUIL_POINTS = SEUIL_BORNAGE;
export { MAX_PALIERS, quantile };
export const NB_COLONNES = NB_BACS;

// Couleur de chaque produit comparé, toujours doublée d'une forme (Repere.jsx).
export const SERIES = ['var(--ct-serie-a)', 'var(--ct-serie-b)', 'var(--ct-serie-c)'];
export const NB_COLONNES_NOTES = 40;

// Écart à partir duquel deux repères empilés seraient confondus à l'œil,
// exprimé en fraction de la largeur de la piste.
const ECART_EMPILEMENT = 0.017;

/*
 * Une ligne d'aide sous chaque critère, pour qui ne sait pas ce que mesure
 * « Geekbench » ou « threads ». Écrite pour un visiteur, pas pour un
 * technicien.
 */
const AIDES = {
  geekbench_multi: 'Gros travaux : montage, rendu, compilation',
  geekbench_single: 'Réactivité sur une tâche à la fois',
  cores: 'Unités de calcul indépendantes',
  threads: 'Tâches menées en parallèle',
  max_freq_ghz: 'Vitesse de pointe, sur un effort court',
  base_freq_ghz: 'Vitesse garantie en continu',
  tdp_w: 'Énergie consommée en pleine charge',
  benchmark_3dmark: 'Performances en jeu (test 3D)',
  memory_gb: 'Mémoire propre à la carte graphique',
  ram_gb: 'Mémoire de travail',
  storage_gb: 'Place pour les fichiers et les applications',
  display_brightness_nits: 'Lisibilité en plein jour',
  battery_life_hours: 'Durée de fonctionnement sur batterie',
  display_size: 'Diagonale de l’écran',
  battery_mah: 'Capacité de la batterie',
  antutu_score: 'Note globale du test AnTuTu',
};

// Les performances d'abord : c'est ce que le visiteur vient comparer.
const ORDRE_GROUPES = ['Performances'];

/**
 * Critères situables dans le marché pour une catégorie : les lignes
 * chiffrées de `SPEC_GROUPS`, dans le même ordre que le reste du site.
 * Une ligne sans `numeric` (unités de calcul GPU, marque) n'a pas de rang :
 * la classer affirmerait une hiérarchie qui n'existe pas.
 */
export function criteresMarche(productType) {
  const type = resolveType(productType);
  if (!type) return [];

  const groupes = [...SPEC_GROUPS[type]].sort((a, b) => {
    const ia = ORDRE_GROUPES.indexOf(a.group);
    const ib = ORDRE_GROUPES.indexOf(b.group);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  return groupes.flatMap(groupe =>
    groupe.rows
      .filter(ligne => ligne.numeric)
      .map(ligne => ({
        key: ligne.key,
        label: ligne.label,
        unit: ligne.unit || null,
        invert: Boolean(ligne.invert),
        groupe: groupe.group,
        aide: AIDES[ligne.key] || null,
      }))
  );
}

/** Mesures exploitables d'une série : les trous et les zéros ne comptent pas. */
export function mesuresValides(valeurs) {
  return (valeurs || []).map(toNumber).filter(v => v !== null && v > 0);
}

/**
 * Rang d'une valeur parmi une série.
 *
 * Rang « sportif » : deux produits égaux partagent le même rang. Si la valeur
 * n'appartient pas à la série (produit absent du catalogue chargé), elle y
 * est ajoutée pour que le total reste juste.
 *
 * @returns {{rang:number,total:number,exAequo:boolean,mot:string|null,top:number|null}|null}
 */
export function classer(valeurs, valeur, inverse = false) {
  const serie = mesuresValides(valeurs);
  const v = toNumber(valeur);
  if (v === null || v <= 0) return null;

  let meilleurs = 0;
  let egaux = 0;
  for (const x of serie) {
    if (inverse ? x < v : x > v) meilleurs += 1;
    else if (x === v) egaux += 1;
  }
  let total = serie.length;
  if (egaux === 0) {
    egaux = 1;
    total += 1;
  }

  const rang = meilleurs + 1;
  const part = meilleurs / total;

  // Sous trois produits, « parmi les meilleurs » ne voudrait rien dire.
  let mot = null;
  if (total >= 3) {
    if (part < 0.2) mot = 'Parmi les meilleurs';
    else if (part < 0.4) mot = 'Au-dessus de la moyenne';
    else if (part < 0.6) mot = 'Dans la moyenne';
    else if (part < 0.8) mot = 'Sous la moyenne';
    else mot = 'Parmi les plus faibles';
  }

  const top = total > 100 ? Math.max(1, Math.ceil((rang / total) * 100)) : null;

  return { rang, total, exAequo: egaux > 1, mot, top };
}

/** « 4e sur 15 », « 1er ex æquo sur 15 » ou « Top 3 % ». */
export function texteRang(classement) {
  if (!classement) return '';
  if (classement.top !== null) return `Top ${classement.top}\u00a0%`;
  const suffixe = classement.rang === 1 ? 'er' : 'e';
  const egalite = classement.exAequo ? ' ex æquo' : '';
  return `${classement.rang}${suffixe}${egalite} sur ${classement.total}`;
}

/**
 * Prépare le tracé d'un critère sur une piste orientée de 0 (moins favorable)
 * à 1 (plus favorable).
 *
 * Trois modes selon la donnée, pour rester lisible de 15 à 10 000 produits :
 *  - `paliers` : peu de valeurs distinctes, un bâton par valeur réelle ;
 *  - `points` : petit catalogue, un repère par produit, empilés sans se
 *    recouvrir ;
 *  - `colonnes` : grand catalogue, des colonnes qui comptent les produits.
 *    L'axe y est borné aux 2 % extrêmes de chaque côté, pour qu'une poignée
 *    de valeurs hors norme n'écrase pas tout le reste dans un coin ; les
 *    produits comparés qui en sortent sont signalés par `horsGauche` /
 *    `horsDroite`.
 *
 * @returns {object|null} null si aucune mesure n'existe dans la catégorie.
 */
export function preparerPiste(valeurs, valeursProduits = [], inverse = false) {
  const mesures = mesuresValides(valeurs).sort((a, b) => a - b);
  if (mesures.length === 0) return null;

  const distinctes = mesures.filter((v, i) => i === 0 || v !== mesures[i - 1]);
  let mode = 'colonnes';
  if (distinctes.length > 1 && distinctes.length <= MAX_PALIERS) mode = 'paliers';
  else if (mesures.length <= SEUIL_POINTS) mode = 'points';

  const borne = mode === 'colonnes';
  const bas = borne ? quantile(mesures, 0.02) : mesures[0];
  const haut = borne ? quantile(mesures, 0.98) : mesures[mesures.length - 1];
  const amplitude = haut - bas || 1;

  const projeter = v => {
    const brut = (v - bas) / amplitude;
    const oriente = inverse ? 1 - brut : brut;
    return {
      t: Math.min(1, Math.max(0, oriente)),
      horsGauche: oriente < -0.001,
      horsDroite: oriente > 1.001,
    };
  };

  let elements = [];
  if (mode === 'paliers') {
    const effectifs = distinctes.map(valeur => mesures.filter(v => v === valeur).length);
    const plusHaut = Math.max(...effectifs);
    elements = distinctes.map((valeur, i) => ({
      valeur,
      t: projeter(valeur).t,
      effectif: effectifs[i],
      hauteur: effectifs[i] / plusHaut,
    }));
  } else if (mode === 'points') {
    const poses = [];
    elements = mesures.map(valeur => {
      const { t } = projeter(valeur);
      let niveau = 0;
      while (poses.some(p => p.niveau === niveau && Math.abs(p.t - t) < ECART_EMPILEMENT)) {
        niveau += 1;
      }
      poses.push({ t, niveau });
      return { valeur, t, niveau };
    });
  } else {
    const comptes = new Array(NB_COLONNES).fill(0);
    for (const v of mesures) {
      const { t, horsGauche, horsDroite } = projeter(v);
      if (horsGauche || horsDroite) continue;
      comptes[Math.min(NB_COLONNES - 1, Math.floor(t * NB_COLONNES))] += 1;
    }
    const plusHaut = Math.max(...comptes, 1);
    elements = comptes.map((effectif, i) => ({
      t: i / NB_COLONNES,
      effectif,
      hauteur: effectif / plusHaut,
    }));
  }

  return {
    mode,
    mesures: mesures.length,
    milieu: projeter(quantile(mesures, 0.5)).t,
    bornes: { gauche: inverse ? haut : bas, droite: inverse ? bas : haut },
    elements,
    marques: valeursProduits.map(v => {
      const n = toNumber(v);
      return n === null || n <= 0 ? null : projeter(n);
    }),
  };
}

/**
 * Prépare l'axe des notes globales, de 0 à 100 (échelle fixe : une note sur
 * 100 se lit telle quelle, sans bornage).
 */
export function preparerAxeNotes(notes) {
  const valides = (notes || []).filter(n => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (!valides.length) return null;

  if (valides.length <= SEUIL_POINTS) {
    const poses = [];
    const points = valides.map(note => {
      const t = note / 100;
      let niveau = 0;
      while (poses.some(p => p.niveau === niveau && Math.abs(p.t - t) < 0.009)) niveau += 1;
      poses.push({ t, niveau });
      return { note, t, niveau };
    });
    return { mode: 'points', milieu: quantile(valides, 0.5), points, colonnes: [] };
  }

  const colonnes = new Array(NB_COLONNES_NOTES).fill(0);
  for (const note of valides) {
    colonnes[Math.min(NB_COLONNES_NOTES - 1, Math.floor((note / 100) * NB_COLONNES_NOTES))] += 1;
  }
  return { mode: 'colonnes', milieu: quantile(valides, 0.5), points: [], colonnes };
}

/**
 * Place des étiquettes de largeur connue au-dessus de leur cible sans
 * qu'elles se chevauchent ni sortent du cadre, à 2 comme à 3 produits.
 *
 * @param {Array<{cible:number,largeur:number}>} etiquettes
 * @returns {number[]} centre retenu de chaque étiquette, dans l'ordre reçu.
 */
export function placerEtiquettes(etiquettes, min, max, marge = 8) {
  const items = etiquettes
    .map((e, index) => ({ ...e, index, centre: e.cible }))
    .sort((a, b) => a.cible - b.cible);

  const borner = it => {
    it.centre = Math.min(max - it.largeur / 2, Math.max(min + it.largeur / 2, it.centre));
  };
  items.forEach(borner);

  for (let passe = 0; passe < 8; passe += 1) {
    for (let i = 1; i < items.length; i += 1) {
      const avant = items[i - 1];
      const courant = items[i];
      const requis = (avant.largeur + courant.largeur) / 2 + marge;
      const ecart = courant.centre - avant.centre;
      if (ecart < requis) {
        const manque = requis - ecart;
        avant.centre -= manque / 2;
        courant.centre += manque / 2;
      }
    }
    items.forEach(borner);
  }

  const centres = new Array(etiquettes.length);
  items.forEach(it => {
    centres[it.index] = it.centre;
  });
  return centres;
}

const MOIS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

/**
 * Source d'une mesure, lisible : « nanoreview.net, relevé le 20 août 2026 ».
 * Formatage à la main plutôt que `toLocaleDateString` : le rendu ne dépend
 * ainsi ni de la langue du navigateur ni des données ICU de Node en test.
 */
export function decrireSource(provenance) {
  if (!provenance || !provenance.url) return null;
  let site;
  try {
    site = new URL(provenance.url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
  const date = provenance.releve_le ? new Date(provenance.releve_le) : null;
  const dateTexte =
    date && !Number.isNaN(date.getTime())
      ? `${date.getUTCDate()} ${MOIS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
      : null;
  return {
    site,
    url: provenance.url,
    date: dateTexte,
    extrait: provenance.extrait || null,
    // Qualification (facultative en phase 1 : absente des fiches de test).
    origine: provenance.origine ? ORIGINES[provenance.origine] || null : null,
    protocole: provenance.protocole ? libelleProtocole(provenance.protocole) : null,
    version: provenance.version || null,
    archive: provenance.archive || null,
  };
}

/**
 * Qualificatif court d'une valeur selon son origine : « mesurée »,
 * « annoncée », « moyenne d'utilisateurs », ou null si la source ne le dit
 * pas. Sert aux intitulés : une autonomie n'est dite « mesurée » que si sa
 * source l'établit, jamais par défaut.
 */
export function qualificatifOrigine(provenance) {
  const origine = provenance && provenance.origine;
  if (origine === 'laboratoire') return 'mesurée';
  if (origine === 'constructeur') return 'annoncée';
  if (origine === 'agregat') return 'moyenne d’utilisateurs';
  return null;
}
