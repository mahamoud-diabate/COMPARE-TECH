/*
 * Définition des axes du radar, par type de produit.
 *
 * Règle : un axe n'existe que s'il correspond à un champ réellement stocké en
 * base (voir backend/models/*.js). Pas d'axe « Prix/Qualité », « Durabilité »
 * ou « Features » : ces données ne sont pas collectées, et un axe qu'on ne
 * peut pas calculer n'a rien à faire sur un graphique de comparaison.
 *
 * `max` est un plafond de référence servant à ramener une valeur brute sur une
 * échelle de 0 à 100. Il ne change pas le classement entre deux produits — il
 * fixe seulement l'échelle. Les plafonds sont alignés sur ceux de `scores.js`
 * pour qu'un même produit n'obtienne pas deux notes différentes selon l'écran.
 */

// Certains champs sont stockés en texte ("5.7", "6.7 pouces") : on en extrait
// le nombre au lieu de laisser une multiplication produire NaN.
const num = value => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return null;
  const parsed = parseFloat(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

export const RADAR_AXES = {
  cpu: [
    { label: 'Mono-cœur', field: 'geekbench_single', max: 3500 },
    { label: 'Multi-cœur', field: 'geekbench_multi', max: 29000 },
    { label: 'Cœurs', field: 'cores', max: 24 },
    { label: 'Threads', field: 'threads', max: 32 },
    { label: 'Fréquence', field: 'max_freq_ghz', max: 6 }
  ],
  gpu: [
    { label: 'Performance 3D', field: 'benchmark_3dmark', max: 35000 },
    { label: 'VRAM', field: 'memory_gb', max: 24 },
    { label: 'Unités de calcul', field: 'cores', max: 22000 }
  ],
  laptop: [
    { label: 'Performance', field: 'geekbench_multi', max: 26000 },
    { label: 'Mémoire', field: 'ram_gb', max: 64 },
    { label: 'Stockage', field: 'storage_gb', max: 4096 },
    { label: 'Luminosité', field: 'display_brightness_nits', max: 1600 },
    { label: 'Autonomie', field: 'battery_life_hours', max: 20 }
  ],
  telephone: [
    { label: 'Puissance', field: 'antutu_score', max: 3200000 },
    { label: 'Batterie', field: 'battery_mah', max: 6000 },
    { label: 'Mémoire', field: 'ram_gb', max: 24 },
    { label: 'Stockage', field: 'storage_gb', max: 1024 },
    { label: 'Écran', field: 'display_size', max: 7 }
  ]
};

// `productType` circule sous plusieurs formes selon les pages ('cpu', 'cpus',
// 'telephones'…). On se ramène à la clé canonique.
export function resolveType(productType) {
  const type = String(productType || '');
  return Object.keys(RADAR_AXES).find(key => type.includes(key)) || null;
}

/**
 * Construit les données du radar pour un ou deux produits.
 *
 * Un axe est retenu seulement si au moins un des produits comparés porte
 * réellement la valeur : afficher un 0 pour une donnée absente laisserait
 * croire à une faiblesse du produit alors qu'il s'agit d'une information
 * manquante.
 */
export function buildRadarData(product1, product2, productType) {
  const type = resolveType(productType || product1?.productType);
  if (!type || !product1) return [];

  const normalize = (raw, max) => {
    const value = num(raw);
    if (value === null || value <= 0) return null;
    return Math.min(100, Math.round((value / max) * 100));
  };

  return RADAR_AXES[type]
    .map(({ label, field, max }) => {
      const a = normalize(product1[field], max);
      const b = product2 ? normalize(product2[field], max) : null;
      if (a === null && b === null) return null;
      return { subject: label, A: a ?? 0, B: b ?? 0, fullMark: 100 };
    })
    .filter(Boolean);
}
