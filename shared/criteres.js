/*
 * Définition unique de chaque critère chiffré, par catégorie.
 *
 * Pourquoi ce fichier existe : la même mesure était décrite à six endroits —
 * le modèle Mongoose, `specs.js` (trois tables), `CHAMPS_MARCHE` côté serveur,
 * `radarAxes.js` et la liste des champs envoyés à l'IA. Son unité, son sens de
 * lecture et son plafond y étaient recopiés à la main, et rien n'empêchait
 * deux copies de diverger. Ici, chaque critère est décrit une fois ; les autres
 * fichiers en dérivent.
 *
 * Ce module ne contient que des RÈGLES : le sens d'une mesure, pas sa mise en
 * page. Les intitulés affichés (« Geekbench 6 (mono-cœur) », « de cœurs »…)
 * restent dans le frontend, qui est seul à savoir où et comment ils s'affichent.
 *
 * Le modèle Mongoose reste la source de vérité de ce qui est STOCKÉ : un
 * critère déclaré ici doit exister dans le modèle correspondant. Les tests de
 * `shared/test/` le vérifient.
 *
 * Champs d'un critère :
 *   key         champ du document en base
 *   nature      'benchmark'       score d'un test logiciel (Geekbench, 3DMark…)
 *               'mesure'          valeur relevée en laboratoire (nits, autonomie)
 *               'caracteristique' donnée de fiche technique (cœurs, Go, GHz)
 *   unite       unité affichée après la valeur, ou null
 *   inverse     true si la valeur la plus basse est la meilleure (consommation)
 *   comparable  false si deux valeurs ne se comparent pas entre marques : la
 *               valeur s'affiche, mais aucun gagnant ni rang n'est calculé
 *   plafond     valeur ramenée à 100 dans les notes et le radar, ou null
 *
 * Aucune dépendance, aucun accès réseau : ce fichier est importé tel quel par
 * le navigateur (via Vite) et par Node (backend et tests).
 */

/** Types canoniques, et segment d'URL / collection correspondant. */
export const SEGMENTS = {
  cpu: 'cpus',
  gpu: 'gpus',
  laptop: 'laptops',
  telephone: 'telephones',
};

export const TYPES = Object.keys(SEGMENTS);

const c = (key, options = {}) =>
  Object.freeze({
    key,
    nature: options.nature || 'caracteristique',
    unite: options.unite ?? null,
    inverse: Boolean(options.inverse),
    comparable: options.comparable !== false,
    plafond: options.plafond ?? null,
  });

/*
 * L'ordre de chaque liste est l'ordre d'affichage par défaut.
 *
 * Plafonds : ils fixent l'échelle, pas le classement entre deux produits. Un
 * produit au-delà du plafond est ramené à 100 (voir formules.js). Les modifier
 * change toutes les notes d'une catégorie : à faire en connaissance de cause.
 */
export const CRITERES = Object.freeze({
  cpu: Object.freeze([
    c('cores', { plafond: 24 }),
    c('threads', { plafond: 32 }),
    c('base_freq_ghz', { unite: 'GHz' }),
    c('max_freq_ghz', { unite: 'GHz', plafond: 6 }),
    c('tdp_w', { unite: 'W', inverse: true }),
    c('geekbench_single', { nature: 'benchmark', plafond: 3500 }),
    c('geekbench_multi', { nature: 'benchmark', plafond: 29000 }),
  ]),

  gpu: Object.freeze([
    // Cœurs CUDA (Nvidia) ou stream processors (AMD) : deux unités différentes.
    // La RX 7900 XTX en annonce 6 144 contre 10 240 à la RTX 4080 SUPER et la
    // devance pourtant en Time Spy. Affichées, jamais départagées.
    c('cores', { comparable: false, plafond: 22000 }),
    c('memory_gb', { unite: 'Go', plafond: 24 }),
    c('tdp_w', { unite: 'W', inverse: true }),
    c('benchmark_3dmark', { nature: 'benchmark', plafond: 35000 }),
  ]),

  laptop: Object.freeze([
    c('ram_gb', { unite: 'Go', plafond: 64 }),
    c('storage_gb', { unite: 'Go', plafond: 4096 }),
    c('display_brightness_nits', { nature: 'mesure', unite: 'nits', plafond: 1600 }),
    c('battery_life_hours', { nature: 'mesure', unite: 'h', plafond: 20 }),
    c('geekbench_multi', { nature: 'benchmark', plafond: 26000 }),
  ]),

  telephone: Object.freeze([
    c('display_size', { unite: 'pouces', plafond: 7 }),
    c('ram_gb', { unite: 'Go', plafond: 24 }),
    c('storage_gb', { unite: 'Go', plafond: 1024 }),
    c('battery_mah', { unite: 'mAh', plafond: 6000 }),
    c('geekbench_single', { nature: 'benchmark', plafond: 3600 }),
    c('geekbench_multi', { nature: 'benchmark', plafond: 9500 }),
    // Pas de plafond : AnTuTu est affiché, mais ne compte dans aucune note.
    c('antutu_score', { nature: 'benchmark' }),
  ]),
});

/**
 * Ramène 'cpus', 'telephone', 'laptops'… au type canonique, ou null.
 * Les pages font circuler le type sous plusieurs formes.
 */
export function resolveType(productType) {
  const type = String(productType || '');
  return TYPES.find(cle => type.includes(cle)) || null;
}

/** Critères d'une catégorie (liste vide si le type est inconnu). */
export function criteresDe(productType) {
  const type = resolveType(productType);
  return type ? CRITERES[type] : [];
}

/**
 * Un critère précis. Lève une erreur s'il n'existe pas : une faute de frappe
 * dans un nom de champ doit casser au chargement, pas produire une colonne
 * vide en silence.
 */
export function critere(productType, key) {
  const trouve = criteresDe(productType).find(cr => cr.key === key);
  if (!trouve) {
    throw new Error(
      `Critère inconnu : ${key} (${productType}). Déclarez-le dans shared/criteres.js.`
    );
  }
  return trouve;
}

/** Plafond d'un critère ; lève une erreur s'il n'en a pas. */
export function plafond(productType, key) {
  const valeur = critere(productType, key).plafond;
  if (!(valeur > 0)) {
    throw new Error(`Le critère ${key} (${productType}) n'a pas de plafond.`);
  }
  return valeur;
}

/** Toutes les clés de mesure, toutes catégories confondues, sans doublon. */
export function toutesLesCles() {
  return [...new Set(TYPES.flatMap(type => CRITERES[type].map(cr => cr.key)))];
}
