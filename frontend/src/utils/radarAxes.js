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
 * fixe seulement l'échelle. Il est lu dans `shared/criteres.js`, comme celui
 * des notes : un même produit ne peut pas obtenir deux échelles selon l'écran.
 */

import { plafond, resolveType as resolveTypePartage } from '../../../shared/criteres.js';

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
    { label: 'Mono-cœur', field: 'geekbench_single', max: plafond('cpu', 'geekbench_single') },
    { label: 'Multi-cœur', field: 'geekbench_multi', max: plafond('cpu', 'geekbench_multi') },
    { label: 'Cœurs', field: 'cores', max: plafond('cpu', 'cores') },
    { label: 'Threads', field: 'threads', max: plafond('cpu', 'threads') },
    { label: 'Fréquence', field: 'max_freq_ghz', max: plafond('cpu', 'max_freq_ghz') },
  ],
  gpu: [
    { label: 'Performance 3D', field: 'benchmark_3dmark', max: plafond('gpu', 'benchmark_3dmark') },
    { label: 'VRAM', field: 'memory_gb', max: plafond('gpu', 'memory_gb') },
    { label: 'Unités de calcul', field: 'cores', max: plafond('gpu', 'cores') },
  ],
  laptop: [
    { label: 'Performance', field: 'geekbench_multi', max: plafond('laptop', 'geekbench_multi') },
    { label: 'Mémoire', field: 'ram_gb', max: plafond('laptop', 'ram_gb') },
    { label: 'Stockage', field: 'storage_gb', max: plafond('laptop', 'storage_gb') },
    {
      label: 'Luminosité',
      field: 'display_brightness_nits',
      max: plafond('laptop', 'display_brightness_nits'),
    },
    {
      label: 'Autonomie',
      field: 'battery_life_hours',
      max: plafond('laptop', 'battery_life_hours'),
    },
  ],
  telephone: [
    {
      label: 'Mono-cœur',
      field: 'geekbench_single',
      max: plafond('telephone', 'geekbench_single'),
    },
    { label: 'Multi-cœur', field: 'geekbench_multi', max: plafond('telephone', 'geekbench_multi') },
    { label: 'Batterie', field: 'battery_mah', max: plafond('telephone', 'battery_mah') },
    { label: 'Mémoire', field: 'ram_gb', max: plafond('telephone', 'ram_gb') },
    { label: 'Stockage', field: 'storage_gb', max: plafond('telephone', 'storage_gb') },
    { label: 'Écran', field: 'display_size', max: plafond('telephone', 'display_size') },
  ],
};

// `productType` circule sous plusieurs formes selon les pages ('cpu', 'cpus',
// 'telephones'…). On se ramène à la clé canonique.
export const resolveType = resolveTypePartage;

/*
 * Libellés secondaires du bloc « Évaluation » : une ligne d'axe sans
 * explication force le lecteur à deviner ce que mesure la note.
 * Les clés doivent reprendre à l'identique les `label` de RADAR_AXES.
 */
export const AXIS_HINTS = {
  'Mono-cœur': 'Réactivité sur une tâche unique',
  'Multi-cœur': 'Rendu, compilation, montage vidéo',
  Cœurs: 'Nombre de cœurs physiques',
  Threads: 'Fils d’exécution simultanés',
  Fréquence: 'Fréquence maximale atteinte',
  'Performance 3D': 'Rendu graphique et jeux',
  VRAM: 'Mémoire dédiée à la carte',
  'Unités de calcul': 'Cœurs CUDA (Nvidia) ou Stream (AMD) — non comparables entre marques',
  Performance: 'Puissance de calcul générale',
  Mémoire: 'Quantité de mémoire vive',
  Stockage: 'Capacité de stockage interne',
  Luminosité: 'Luminosité maximale de l’écran',
  Autonomie: 'Durée d’utilisation annoncée',
  Batterie: 'Capacité de la batterie',
  Écran: 'Diagonale de l’écran',
};

/**
 * Notes par critère, sur 100, pour un ou plusieurs produits.
 * Réutilise exactement les axes du radar : afficher deux échelles
 * différentes pour la même donnée selon l'écran serait incohérent.
 *
 * Renvoie [{ label, hint, values: [n|null, ...] }]
 */
export function buildCategoryScores(products, productType) {
  const list = (products || []).filter(Boolean);
  const type = resolveType(productType || list[0]?.productType);
  if (!type || list.length === 0) return [];

  const normalize = (raw, max) => {
    const value = num(raw);
    if (value === null || value <= 0) return null;
    return Math.min(100, Math.round((value / max) * 100));
  };

  return RADAR_AXES[type]
    .map(({ label, field, max }) => {
      const values = list.map(p => normalize(p[field], max));
      if (values.every(v => v === null)) return null;
      return { label, hint: AXIS_HINTS[label] || '', values };
    })
    .filter(Boolean);
}
