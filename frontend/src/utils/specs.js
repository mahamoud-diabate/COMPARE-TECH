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

import { critere, resolveType as resolveTypePartage } from '../../../shared/criteres.js';

/*
 * Les trois aides ci-dessous lisent l'unité, le sens de lecture et le plafond
 * de chaque critère dans `shared/criteres.js`. Ce fichier ne garde que ce qui
 * relève de l'affichage : intitulés, groupes et ordre des lignes.
 */

/** Ligne de tableau : `numeric` vaut `comparable`, `invert` vaut `inverse`. */
function ligne(type, key, label) {
  const cr = critere(type, key);
  const row = { label, key };
  if (cr.unite) row.unit = cr.unite;
  if (cr.comparable) row.numeric = true;
  if (cr.inverse) row.invert = true;
  return row;
}

/** Barre de benchmark : l'échelle est le plafond du critère. */
function barre(type, key, label) {
  const cr = critere(type, key);
  const row = { label, key, max: cr.plafond };
  if (cr.nature !== 'benchmark' && cr.unite) row.unit = cr.unite;
  return row;
}

/** Métrique des synthèses (« 50 % de cœurs »). */
function metrique(type, key, label) {
  const cr = critere(type, key);
  const row = { key, label };
  if (cr.unite) row.unit = cr.unite;
  if (cr.inverse) row.invert = true;
  return row;
}

export const SPEC_GROUPS = {
  cpu: [
    {
      group: 'Général',
      rows: [
        { label: 'Marque', key: 'brand' },
        ligne('cpu', 'cores', 'Cœurs'),
        ligne('cpu', 'threads', 'Threads'),
        ligne('cpu', 'base_freq_ghz', 'Fréquence de base'),
        ligne('cpu', 'max_freq_ghz', 'Fréquence maximale'),
        ligne('cpu', 'tdp_w', 'Consommation'),
      ],
    },
    {
      group: 'Performances',
      rows: [
        ligne('cpu', 'geekbench_single', 'Geekbench 6 (mono-cœur)'),
        ligne('cpu', 'geekbench_multi', 'Geekbench 6 (multi-cœur)'),
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
        ligne('gpu', 'cores', 'Unités de calcul'),
        ligne('gpu', 'memory_gb', 'Mémoire vidéo'),
        { label: 'Type de mémoire', key: 'memory_type' },
        ligne('gpu', 'tdp_w', 'Consommation'),
      ],
    },
    {
      group: 'Performances',
      rows: [ligne('gpu', 'benchmark_3dmark', '3DMark')],
    },
  ],

  laptop: [
    {
      group: 'Configuration',
      rows: [
        { label: 'Marque', key: 'brand' },
        { label: 'Processeur', key: 'cpu_name' },
        { label: 'Carte graphique', key: 'gpu_name' },
        ligne('laptop', 'ram_gb', 'Mémoire vive'),
        ligne('laptop', 'storage_gb', 'Stockage'),
      ],
    },
    {
      group: 'Écran et autonomie',
      rows: [
        ligne('laptop', 'display_brightness_nits', 'Luminosité'),
        ligne('laptop', 'battery_life_hours', 'Autonomie annoncée'),
      ],
    },
    {
      group: 'Performances',
      rows: [ligne('laptop', 'geekbench_multi', 'Geekbench 6 (multi-cœur)')],
    },
  ],

  telephone: [
    {
      group: 'Général',
      rows: [
        { label: 'Marque', key: 'brand' },
        ligne('telephone', 'display_size', 'Taille de l’écran'),
        { label: 'Processeur', key: 'cpu_name' },
        ligne('telephone', 'ram_gb', 'Mémoire vive'),
        ligne('telephone', 'storage_gb', 'Stockage'),
      ],
    },
    {
      group: 'Batterie',
      rows: [ligne('telephone', 'battery_mah', 'Capacité')],
    },
    {
      group: 'Performances',
      rows: [
        ligne('telephone', 'geekbench_single', 'Geekbench 6 (mono-cœur)'),
        ligne('telephone', 'geekbench_multi', 'Geekbench 6 (multi-cœur)'),
        ligne('telephone', 'antutu_score', 'AnTuTu'),
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
    barre('cpu', 'geekbench_single', 'Geekbench 6 (mono-cœur)'),
    barre('cpu', 'geekbench_multi', 'Geekbench 6 (multi-cœur)'),
  ],
  gpu: [barre('gpu', 'benchmark_3dmark', '3DMark')],
  laptop: [
    barre('laptop', 'geekbench_multi', 'Geekbench 6 (multi-cœur)'),
    barre('laptop', 'display_brightness_nits', 'Luminosité maximale'),
    barre('laptop', 'battery_life_hours', 'Autonomie'),
  ],
  telephone: [
    barre('telephone', 'geekbench_single', 'Geekbench 6 mono-cœur'),
    barre('telephone', 'geekbench_multi', 'Geekbench 6 multi-cœur'),
    barre('telephone', 'battery_mah', 'Batterie'),
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
    metrique('cpu', 'geekbench_multi', 'de performances multi-cœur'),
    metrique('cpu', 'geekbench_single', 'de performances mono-cœur'),
    metrique('cpu', 'cores', 'de cœurs'),
    metrique('cpu', 'threads', 'de threads'),
    metrique('cpu', 'max_freq_ghz', 'de fréquence maximale'),
    metrique('cpu', 'tdp_w', 'de consommation'),
  ],
  gpu: [
    metrique('gpu', 'benchmark_3dmark', 'de performances 3D'),
    metrique('gpu', 'memory_gb', 'de mémoire vidéo'),
    metrique('gpu', 'tdp_w', 'de consommation'),
  ],
  laptop: [
    metrique('laptop', 'geekbench_multi', 'de performances'),
    metrique('laptop', 'battery_life_hours', 'd’autonomie'),
    metrique('laptop', 'display_brightness_nits', 'de luminosité'),
    metrique('laptop', 'ram_gb', 'de mémoire vive'),
    metrique('laptop', 'storage_gb', 'de stockage'),
  ],
  telephone: [
    metrique('telephone', 'geekbench_multi', 'de puissance multi-cœur'),
    metrique('telephone', 'geekbench_single', 'de réactivité (mono-cœur)'),
    metrique('telephone', 'battery_mah', 'de capacité de batterie'),
    metrique('telephone', 'ram_gb', 'de mémoire vive'),
    metrique('telephone', 'storage_gb', 'de stockage'),
    metrique('telephone', 'display_size', 'de diagonale d’écran'),
  ],
};

/** Ramène 'cpus', 'telephone', 'laptops'… à la clé canonique du catalogue. */
export const resolveType = resolveTypePartage;

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

  const bestVal = invert ? Math.min(...present) : Math.max(...present);
  const bestIndices = [];
  values.forEach((v, i) => {
    if (v === bestVal) bestIndices.push(i);
  });

  return bestIndices.length === 1 ? bestIndices[0] : -1;
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

  (KEY_METRICS[type] || []).forEach(({ key, label, unit, invert }) => {
    const va = toNumber(a[key]);
    const vb = toNumber(b[key]);
    if (va === null || vb === null || va <= 0 || vb <= 0 || va === vb) return;

    const high = Math.max(va, vb);
    const low = Math.min(va, vb);
    if (invert) {
      const winner = va < vb ? 'a' : 'b';
      const delta = Math.round(((high - low) / high) * 100);
      if (delta < 3) return;
      result[winner].push(
        `${delta} % ${label} en moins (${formatValue(low, unit)} contre ${formatValue(high, unit)})`
      );
      return;
    }

    const winner = va > vb ? 'a' : 'b';
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

    metrics.forEach(({ key, label, unit, invert }) => {
      const values = products.map(p => toNumber(p?.[key]));
      const mine = values[index];
      if (mine === null || mine <= 0) return;

      const rivals = values.filter((value, i) => i !== index && value !== null && value > 0);
      if (rivals.length === 0) return;

      if (invert) {
        const bestRival = Math.min(...rivals);
        if (mine >= bestRival) return;

        const delta = Math.round(((bestRival - mine) / bestRival) * 100);
        if (delta < 3) return;

        lines.push(
          `${delta} % ${label} en moins que son meilleur rival (${formatValue(mine, unit)})`
        );
        return;
      }

      const bestRival = Math.max(...rivals);
      if (mine <= bestRival) return;

      const delta = Math.round(((mine - bestRival) / bestRival) * 100);
      if (delta < 3) return;

      lines.push(`${delta} % ${label} de plus que son meilleur rival (${formatValue(mine, unit)})`);
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
