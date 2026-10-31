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
 *   departage   false pour une « spec papier » (fréquences, cœurs, threads) :
 *               la valeur s'affiche et se situe dans le marché, mais n'est
 *               jamais désignée gagnante ni citée comme avantage, car elle ne
 *               prédit pas les performances. Vaut `comparable` par défaut.
 *   comparable  false si deux valeurs ne se comparent pas entre marques : la
 *               valeur s'affiche, mais aucun gagnant ni rang n'est calculé
 *   plafond     valeur ramenée à 100 dans les notes et le radar, ou null
 *   protocoles  identifiants des tests acceptés pour cette mesure (voir
 *               PROTOCOLES), le premier étant la RÉFÉRENCE ; liste vide pour
 *               une caractéristique de fiche technique, qui n'a pas de test
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

/*
 * Zone d'égalité : deux valeurs à moins de 3 % l'une de l'autre sont
 * « équivalentes ». Sous ce seuil, l'écart ne se ressent pas à l'usage et se
 * situe dans la variation d'une mesure à l'autre d'un même benchmark : en
 * désigner un gagnant fabriquerait une différence. Toute désignation de
 * gagnant du site (tableaux, badge « Meilleure note », différences clés,
 * avantages) passe par `equivalents`.
 */
export const SEUIL_EGALITE = 0.03;

/**
 * Deux valeurs positives sont-elles équivalentes (écart relatif à la plus
 * grande inférieur à SEUIL_EGALITE) ? Une valeur absente, nulle ou négative
 * n'est équivalente à rien.
 */
export function equivalents(a, b) {
  if (!(Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0)) return false;
  return Math.abs(a - b) / Math.max(a, b) < SEUIL_EGALITE;
}

/*
 * Qui a produit une valeur. Distinct de la `nature` d'un critère : une
 * autonomie (critère de nature « mesure ») peut être annoncée par le
 * constructeur ou mesurée par un laboratoire, et les deux ne se valent pas.
 * Voir docs/PROPOSITION-MESURE.md.
 */
export const ORIGINES = Object.freeze({
  constructeur: 'annoncée par le constructeur',
  laboratoire: 'mesurée par un laboratoire',
  agregat: 'moyenne de relevés d’utilisateurs',
});

/*
 * Tests et protocoles de mesure reconnus. Un identifiant porte la version
 * MAJEURE du test (`geekbench-6`, pas `geekbench`) : c'est elle qui change
 * l'échelle des scores. La sous-version, quand la source la donne, va dans le
 * champ `version` de la provenance.
 *
 * Accepter un nouveau test demande une ligne ici ET dans la liste `protocoles`
 * du critère : une décision explicite, jamais une faute de frappe saisie dans
 * un formulaire.
 */
export const PROTOCOLES = Object.freeze({
  'geekbench-6': 'Geekbench 6',
  'geekbench-5': 'Geekbench 5',
  'cinebench-2024': 'Cinebench 2024',
  'nanoreview-fps-ultra': 'NanoReview, moyenne de jeux en réglages Ultra',
  '3dmark-time-spy-graphics': '3DMark Time Spy (score graphique)',
  '3dmark-time-spy': '3DMark Time Spy (score global)',
  '3dmark-time-spy-extreme-graphics': '3DMark Time Spy Extreme (score graphique)',
  '3dmark-steel-nomad': '3DMark Steel Nomad',
  'antutu-11': 'AnTuTu 11',
  'antutu-10': 'AnTuTu 10',
  'notebookcheck-wifi': 'Notebookcheck, navigation Wi-Fi',
  'notebookcheck-luminance-moyenne': 'Notebookcheck, moyenne de 9 points',
  'annonce-constructeur': 'Valeur annoncée par le constructeur',
});

/** Libellé lisible d'un protocole, ou l'identifiant brut s'il est inconnu. */
export function libelleProtocole(id) {
  return PROTOCOLES[id] || id;
}

const c = (key, options = {}) =>
  Object.freeze({
    key,
    nature: options.nature || 'caracteristique',
    unite: options.unite ?? null,
    inverse: Boolean(options.inverse),
    comparable: options.comparable !== false,
    // Un critère non comparable n'est a fortiori jamais départagé.
    departage: options.comparable !== false && options.departage !== false,
    plafond: options.plafond ?? null,
    protocoles: Object.freeze([...(options.protocoles || [])]),
  });

// Listes réutilisées : le premier élément est le test de référence.
const GEEKBENCH = ['geekbench-6', 'geekbench-5'];
const FPS = ['nanoreview-fps-ultra'];

/*
 * L'ordre de chaque liste est l'ordre d'affichage par défaut.
 *
 * Plafonds : ils fixent l'échelle, pas le classement entre deux produits. Un
 * produit au-delà du plafond est ramené à 100 (voir formules.js). Les modifier
 * change toutes les notes d'une catégorie : à faire en connaissance de cause.
 */
export const CRITERES = Object.freeze({
  cpu: Object.freeze([
    // Specs papier : un cœur, un thread ou un GHz ne valent pas la même chose
    // d'une architecture à l'autre. Affichés et situés, jamais départagés :
    // c'est Geekbench qui dit lequel calcule le plus vite.
    c('cores', { plafond: 24, departage: false }),
    c('threads', { plafond: 32, departage: false }),
    c('base_freq_ghz', { unite: 'GHz', departage: false }),
    c('max_freq_ghz', { unite: 'GHz', plafond: 6, departage: false }),
    // Davantage de cache aide surtout en jeu (puces X3D), pas partout : une
    // spec papier de plus, située mais jamais départagée.
    c('cache_l3_mo', { unite: 'Mo', departage: false }),
    // Plus récent ne veut pas dire meilleur : ni rang, ni gagnant. Sert au
    // futur profil « Longévité ».
    c('annee_sortie', { comparable: false }),
    c('tdp_w', { unite: 'W', inverse: true }),
    c('geekbench_single', { nature: 'benchmark', plafond: 3500, protocoles: GEEKBENCH }),
    c('geekbench_multi', { nature: 'benchmark', plafond: 29000, protocoles: GEEKBENCH }),
    // Affiché et départagé, mais hors de la note sur 100 tant que la formule
    // n'est pas revue (profils d'usage) : pas de plafond.
    c('cinebench_2024_multi', { nature: 'benchmark', protocoles: ['cinebench-2024'] }),
  ]),

  gpu: Object.freeze([
    // Cœurs CUDA (Nvidia) ou stream processors (AMD) : deux unités différentes.
    // La RX 7900 XTX en annonce 6 144 contre 10 240 à la RTX 4080 SUPER et la
    // devance pourtant en Time Spy. Affichées, jamais départagées.
    c('cores', { comparable: false, plafond: 22000 }),
    c('memory_gb', { unite: 'Go', plafond: 24 }),
    c('tdp_w', { unite: 'W', inverse: true }),
    c('benchmark_3dmark', {
      nature: 'benchmark',
      plafond: 35000,
      protocoles: [
        '3dmark-time-spy-graphics',
        '3dmark-time-spy',
        '3dmark-time-spy-extreme-graphics',
        '3dmark-steel-nomad',
      ],
    }),
    // FPS moyens en jeu : départagés (zone d'égalité à 3 %), hors de la note
    // globale ; ils serviront au profil « Jeu ».
    c('fps_1080p', { nature: 'benchmark', unite: 'FPS', protocoles: FPS }),
    c('fps_1440p', { nature: 'benchmark', unite: 'FPS', protocoles: FPS }),
    c('fps_4k', { nature: 'benchmark', unite: 'FPS', protocoles: FPS }),
  ]),

  laptop: Object.freeze([
    c('ram_gb', { unite: 'Go', plafond: 64 }),
    c('storage_gb', { unite: 'Go', plafond: 4096 }),
    c('display_brightness_nits', {
      nature: 'mesure',
      unite: 'nits',
      plafond: 1600,
      protocoles: ['notebookcheck-luminance-moyenne', 'annonce-constructeur'],
    }),
    c('battery_life_hours', {
      nature: 'mesure',
      unite: 'h',
      plafond: 20,
      protocoles: ['notebookcheck-wifi', 'annonce-constructeur'],
    }),
    c('geekbench_multi', { nature: 'benchmark', plafond: 26000, protocoles: GEEKBENCH }),
  ]),

  telephone: Object.freeze([
    c('display_size', { unite: 'pouces', plafond: 7 }),
    c('ram_gb', { unite: 'Go', plafond: 24 }),
    c('storage_gb', { unite: 'Go', plafond: 1024 }),
    c('battery_mah', { unite: 'mAh', plafond: 6000 }),
    c('geekbench_single', { nature: 'benchmark', plafond: 3600, protocoles: GEEKBENCH }),
    c('geekbench_multi', { nature: 'benchmark', plafond: 9500, protocoles: GEEKBENCH }),
    // Pas de plafond : AnTuTu est affiché, mais ne compte dans aucune note.
    c('antutu_score', { nature: 'benchmark', protocoles: ['antutu-11', 'antutu-10'] }),
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
