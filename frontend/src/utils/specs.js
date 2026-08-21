/*
 * Catalogue unique des specs affichables, par type de produit.
 *
 * Une seule source de vérité pour : le tableau comparatif, la fiche produit,
 * les barres de benchmark et la génération des « différences clés ». Avant,
 * chaque écran redéclarait sa propre liste et elles divergeaient (le tableau
 * comparatif affichait un TDP et un socket qui n'existent dans aucun modèle
 * Mongo — voir backend/models/*.js).
 *
 * Règle : une ligne n'existe ici que si le champ est réellement stocké en base.
 *
 * Clés de chaque ligne :
 *   label    — intitulé affiché
 *   key      — champ du document
 *   unit     — suffixe affiché après la valeur (optionnel)
 *   numeric  — la valeur se compare chiffre à chiffre (surligne un gagnant)
 *   invert   — plus petit = meilleur (consommation, poids…)
 */

export const SPEC_GROUPS = {
  cpu: [
    {
      group: 'Général',
      rows: [
        { label: 'Marque', key: 'brand' },
        { label: 'Cœurs', key: 'cores', numeric: true },
        { label: 'Threads', key: 'threads', numeric: true },
        { label: 'Fréquence de base', key: 'base_freq_ghz', unit: 'GHz', numeric: true },
        { label: 'Fréquence maximale', key: 'max_freq_ghz', unit: 'GHz', numeric: true },
      ],
    },
    {
      group: 'Performances',
      rows: [
        { label: 'Geekbench 6 (mono-cœur)', key: 'geekbench_single', numeric: true },
        { label: 'Geekbench 6 (multi-cœur)', key: 'geekbench_multi', numeric: true },
      ],
    },
  ],

  gpu: [
    {
      group: 'Général',
      rows: [
        { label: 'Marque', key: 'brand' },
        // Pas de `numeric` : la valeur s'affiche, mais aucun gagnant n'est
        // désigné. Un GPU Nvidia compte des cœurs CUDA, un GPU AMD des stream
        // processors — deux unités différentes. La RX 7900 XTX en annonce
        // 6 144 contre 10 240 à la RTX 4080 SUPER, et devance pourtant cette
        // dernière de 9 % en Time Spy. Surligner le plus grand nombre
        // affirmerait quelque chose de faux.
        { label: 'Unités de calcul', key: 'cores' },
        { label: 'Mémoire vidéo', key: 'memory_gb', unit: 'Go', numeric: true },
        { label: 'Type de mémoire', key: 'memory_type' },
      ],
    },
    {
      group: 'Performances',
      rows: [{ label: '3DMark', key: 'benchmark_3dmark', numeric: true }],
    },
  ],

  laptop: [
    {
      group: 'Configuration',
      rows: [
        { label: 'Marque', key: 'brand' },
        { label: 'Processeur', key: 'cpu_name' },
        { label: 'Carte graphique', key: 'gpu_name' },
        { label: 'Mémoire vive', key: 'ram_gb', unit: 'Go', numeric: true },
        { label: 'Stockage', key: 'storage_gb', unit: 'Go', numeric: true },
      ],
    },
    {
      group: 'Écran et autonomie',
      rows: [
        { label: 'Luminosité', key: 'display_brightness_nits', unit: 'nits', numeric: true },
        { label: 'Autonomie annoncée', key: 'battery_life_hours', unit: 'h', numeric: true },
      ],
    },
    {
      group: 'Performances',
      rows: [{ label: 'Geekbench 6 (multi-cœur)', key: 'geekbench_multi', numeric: true }],
    },
  ],

  telephone: [
    {
      group: 'Général',
      rows: [
        { label: 'Marque', key: 'brand' },
        { label: 'Taille de l’écran', key: 'display_size', unit: 'pouces', numeric: true },
        { label: 'Processeur', key: 'cpu_name' },
        { label: 'Mémoire vive', key: 'ram_gb', unit: 'Go', numeric: true },
        { label: 'Stockage', key: 'storage_gb', unit: 'Go', numeric: true },
      ],
    },
    {
      group: 'Batterie',
      rows: [{ label: 'Capacité', key: 'battery_mah', unit: 'mAh', numeric: true }],
    },
    {
      group: 'Performances',
      rows: [
        { label: 'Geekbench 6 (mono-cœur)', key: 'geekbench_single', numeric: true },
        { label: 'Geekbench 6 (multi-cœur)', key: 'geekbench_multi', numeric: true },
        { label: 'AnTuTu', key: 'antutu_score', numeric: true },
      ],
    },
  ],
};

/*
 * Benchmarks tracés sous forme de barres.
 * `max` sert uniquement d'échelle d'affichage quand un seul produit est
 * présenté ; en comparaison, la barre est relative au meilleur des produits.
 */
export const BENCHMARKS = {
  cpu: [
    { label: 'Geekbench 6 (mono-cœur)', key: 'geekbench_single', max: 3500 },
    { label: 'Geekbench 6 (multi-cœur)', key: 'geekbench_multi', max: 29000 },
  ],
  gpu: [{ label: '3DMark', key: 'benchmark_3dmark', max: 35000 }],
  laptop: [
    { label: 'Geekbench 6 (multi-cœur)', key: 'geekbench_multi', max: 26000 },
    { label: 'Luminosité maximale', key: 'display_brightness_nits', max: 1600, unit: 'nits' },
    { label: 'Autonomie', key: 'battery_life_hours', max: 20, unit: 'h' },
  ],
  telephone: [
    { label: 'Geekbench 6 mono-cœur', key: 'geekbench_single', max: 3600 },
    { label: 'Geekbench 6 multi-cœur', key: 'geekbench_multi', max: 9500 },
    { label: 'Batterie', key: 'battery_mah', max: 6000, unit: 'mAh' },
  ],
};

/*
 * Champs retenus pour les synthèses (`buildKeyDifferences`, `buildStrengths`).
 * `label` se lit à la suite d'un pourcentage : « 50 % de cœurs ». On affiche
 * toujours les valeurs brutes à côté de l'écart, pour que le lecteur puisse
 * vérifier le pourcentage annoncé.
 */
export const KEY_METRICS = {
  cpu: [
    { key: 'geekbench_multi', label: 'de performances multi-cœur' },
    { key: 'geekbench_single', label: 'de performances mono-cœur' },
    { key: 'cores', label: 'de cœurs' },
    { key: 'threads', label: 'de threads' },
    { key: 'max_freq_ghz', label: 'de fréquence maximale', unit: 'GHz' },
  ],
  gpu: [
    { key: 'benchmark_3dmark', label: 'de performances 3D' },
    { key: 'memory_gb', label: 'de mémoire vidéo', unit: 'Go' },

  ],
  laptop: [
    { key: 'geekbench_multi', label: 'de performances' },
    { key: 'battery_life_hours', label: 'd’autonomie', unit: 'h' },
    { key: 'display_brightness_nits', label: 'de luminosité', unit: 'nits' },
    { key: 'ram_gb', label: 'de mémoire vive', unit: 'Go' },
    { key: 'storage_gb', label: 'de stockage', unit: 'Go' },
  ],
  telephone: [
    { key: 'geekbench_multi', label: 'de puissance multi-cœur' },
    { key: 'geekbench_single', label: 'de réactivité (mono-cœur)' },
    { key: 'battery_mah', label: 'de capacité de batterie', unit: 'mAh' },
    { key: 'ram_gb', label: 'de mémoire vive', unit: 'Go' },
    { key: 'storage_gb', label: 'de stockage', unit: 'Go' },
    { key: 'display_size', label: 'de diagonale d’écran', unit: 'pouces' },
  ],
};

/** Ramène 'cpus', 'telephone', 'laptops'… à la clé canonique du catalogue. */
export function resolveType(productType) {
  const type = String(productType || '');
  return Object.keys(SPEC_GROUPS).find(key => type.includes(key)) || null;
}

/**
 * Extrait un nombre d'une valeur qui peut être stockée en texte
 * ('5.7', '6,7 pouces', '5.2 GHz'). Renvoie null si rien d'exploitable :
 * un 0 par défaut ferait passer une donnée manquante pour une faiblesse.
 */
export function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const match = value.replace(',', '.').match(/-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : null;
}

/** Formatage lisible : séparateur de milliers au-delà de 9999. */
export function formatValue(value, unit) {
  if (value === undefined || value === null || value === '') return null;
  let text;
  if (typeof value === 'number') {
    text = Math.abs(value) >= 10000 ? value.toLocaleString('fr-FR') : String(value);
  } else {
    text = String(value);
  }
  if (unit && !text.toLowerCase().includes(unit.toLowerCase())) {
    text = `${text} ${unit}`;
  }
  return text;
}

/**
 * Index du produit gagnant sur une ligne, ou -1.
 * Renvoie -1 dès que toutes les valeurs sont égales : surligner une égalité
 * ferait croire à un avantage.
 */
export function winnerIndex(products, key, invert = false) {
  const values = products.map(p => toNumber(p?.[key]));
  const present = values.filter(v => v !== null && v > 0);
  if (present.length < 2) return -1;
  if (present.every(v => v === present[0])) return -1;

  let best = -1;
  values.forEach((v, i) => {
    if (v === null || v <= 0) return;
    if (best === -1) { best = i; return; }
    const isBetter = invert ? v < values[best] : v > values[best];
    if (isBetter) best = i;
  });
  return best;
}

/**
 * Différences clés entre deux produits, groupées par gagnant.
 * Un écart inférieur à 3 % est ignoré : sous ce seuil, la différence n'est
 * pas perceptible à l'usage et encombrerait la synthèse.
 */
export function buildKeyDifferences(a, b, productType) {
  const type = resolveType(productType);
  if (!type || !a || !b) return { a: [], b: [] };

  const result = { a: [], b: [] };

  (KEY_METRICS[type] || []).forEach(({ key, label, unit }) => {
    const va = toNumber(a[key]);
    const vb = toNumber(b[key]);
    if (va === null || vb === null || va <= 0 || vb <= 0 || va === vb) return;

    const winner = va > vb ? 'a' : 'b';
    const high = Math.max(va, vb);
    const low = Math.min(va, vb);
    const delta = Math.round(((high - low) / low) * 100);
    if (delta < 3) return;

    result[winner].push(
      `${delta} % ${label} (${formatValue(high, unit)} contre ${formatValue(low, unit)})`
    );
  });

  return result;
}

/**
 * Points forts de chaque produit dans une comparaison à trois ou plus.
 *
 * `buildKeyDifferences` oppose deux produits terme à terme ; au-delà, cette
 * lecture n'existe plus (A bat B sur un critère mais perd contre C). On
 * bascule donc sur une autre question, la seule qui reste bien définie :
 * sur quels critères ce produit devance-t-il *tous* les autres, et de combien
 * par rapport au plus proche ?
 *
 * @returns {string[][]} une liste de raisons par produit, dans le même ordre.
 */
export function buildStrengths(products, productType) {
  const type = resolveType(productType);
  if (!type || !Array.isArray(products) || products.length < 2) return [];

  const metrics = KEY_METRICS[type] || [];

  return products.map((product, index) => {
    const lines = [];

    metrics.forEach(({ key, label, unit }) => {
      const values = products.map(p => toNumber(p?.[key]));
      const mine = values[index];
      if (mine === null || mine <= 0) return;

      const rivals = values.filter((value, i) => i !== index && value !== null && value > 0);
      if (rivals.length === 0) return;

      const bestRival = Math.max(...rivals);
      if (mine <= bestRival) return;

      const delta = Math.round(((mine - bestRival) / bestRival) * 100);
      if (delta < 3) return;

      lines.push(
        `${delta} % ${label} de plus que son meilleur rival (${formatValue(mine, unit)})`
      );
    });

    return lines;
  });
}

/**
 * Part des caractéristiques réellement renseignées pour un produit.
 *
 * Affiché tel quel sur la fiche : un comparateur qui masque ses trous laisse
 * croire que l'absence de valeur est une valeur. Mieux vaut annoncer « 6 sur
 * 8 » et nommer ce qui manque.
 *
 * @returns {{remplies: number, total: number, manquantes: string[]}}
 */
export function dataCompleteness(product, productType) {
  const type = resolveType(productType || product?.productType);
  if (!type || !product) return { remplies: 0, total: 0, manquantes: [] };

  const lignes = SPEC_GROUPS[type].flatMap(groupe => groupe.rows);
  const manquantes = lignes
    .filter(ligne => {
      const valeur = product[ligne.key];
      return valeur === undefined || valeur === null || valeur === '';
    })
    .map(ligne => ligne.label);

  return {
    remplies: lignes.length - manquantes.length,
    total: lignes.length,
    manquantes,
  };
}
