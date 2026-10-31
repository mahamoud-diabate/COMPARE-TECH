/*
 * Données et calculs de la fiche produit (Refonte Pistes A & C).
 *
 * Ce module transforme un produit brut en structure d'affichage complète :
 * 1. Les 3 profils d'usage commutables par onglets (Piste C).
 * 2. La synthèse matérielle (4 chiffres clés pour la barre latérale sticky).
 * 3. La datasheet complète avec explications simples et sources vérifiées (Piste A).
 *
 * Fonctions pures, sans DOM, testables directement sous Node.
 */

import { SPEC_GROUPS, resolveType, formatValue } from './specs.js';
import { decrireSource, qualificatifOrigine } from './marche.js';
import { critere, criteresDe } from '../../../shared/criteres.js';
import { notesParUsage } from '../../../shared/usages.js';

const AIDES_SPEC = {
  geekbench_multi: 'Mesure standardisée en calcul parallèle lourd (montage, compression)',
  geekbench_single: 'Réactivité brute sur une seule tâche à la fois',
  cores: 'Nombre de cœurs physiques de calcul matériels',
  threads: 'Fils d’exécution simultanés (multithreading)',
  max_freq_ghz: 'Fréquence d’horloge maximale sous charge brève (Boost)',
  base_freq_ghz: 'Fréquence d’horloge garantie en utilisation continue',
  tdp_w: 'Puissance annoncée par le constructeur ; la consommation réelle n’est pas mesurée',
  socket: 'Plateforme de la carte mère : détermine les évolutions possibles',
  annee_sortie: 'Année de commercialisation annoncée par le constructeur',
  cache_l3_mo: 'Mémoire cache partagée ; aide surtout en jeu, pas partout',
  cinebench_2024_multi: 'Rendu 3D sur tous les cœurs, charge longue (Cinebench 2024)',
  benchmark_3dmark: 'Score de référence sur le banc graphique 3DMark Time Spy',
  fps_1080p: 'Images par seconde moyennes sur un panel de jeux, réglages Ultra',
  fps_1440p: 'Images par seconde moyennes sur un panel de jeux, réglages Ultra',
  fps_4k: 'Images par seconde moyennes sur un panel de jeux, réglages Ultra',
  memory_gb: 'Capacité de mémoire vidéo dédiée (VRAM)',
  memory_type: 'Norme et génération de la mémoire vidéo (GDDR)',
  cpu_name: 'Modèle du processeur principal intégré',
  gpu_name: 'Modèle du circuit graphique intégré ou dédié',
  ram_gb: 'Mémoire vive système allouée aux applications',
  storage_gb: 'Capacité de stockage interne haute vitesse',
  display_brightness_nits:
    'Luminance de l’écran en nits ; la source précise comment elle a été obtenue',
  battery_life_hours: 'Durée sur batterie ; la source précise si elle est annoncée ou mesurée',
  display_size: 'Diagonale de la dalle tactile en pouces',
  battery_mah: 'Capacité nominale de la batterie interne',
  antutu_score: 'Score global mesurant processeur, graphique et mémoire',
};

/** Intitulé affiché d'une mesure, lu dans SPEC_GROUPS (une seule source). */
function intituleDe(type, key) {
  for (const groupe of SPEC_GROUPS[type] || []) {
    const ligne = groupe.rows.find(r => r.key === key);
    if (ligne) return ligne.label;
  }
  return key;
}

/**
 * Profils d'usage de la fiche, calculés par `shared/usages.js`.
 *
 * Remplace les anciens textes, qui déduisaient « images par seconde élevées »
 * d'une fréquence turbo ou « 4K sans compromis » d'un score Time Spy, et
 * comblaient les manques par des valeurs par défaut. Désormais, chaque profil
 * affiche une note calculée sur des mesures sourcées, et les mesures qui la
 * composent ; sans mesure, il le dit.
 */
export function genererUsages(product, productType) {
  const type = resolveType(productType || product?.productType);
  if (!type || !product) return [];

  return notesParUsage(product, type).map(n => {
    const detail = n.termes
      .map(t => {
        const nom = intituleDe(type, t.key);
        const poids = n.termes.length > 1 ? ` (${Math.round(t.poids * 100)} %)` : '';
        return t.valeur === null
          ? `${nom} : non relevé${poids}`
          : `${nom} : <strong>${formatValue(t.valeur, critere(type, t.key).unite)}</strong>${poids}`;
      })
      .join('<br/>');

    return {
      id: n.id,
      titre: n.titre,
      specTitre: `Note ${n.titre.toLowerCase()}`,
      specVal: n.note === null ? 'Non noté' : `${n.note} / 100`,
      resume:
        n.note === null
          ? 'Une mesure manque : la note n’est pas calculée plutôt que d’être devinée.'
          : `${n.description}. 100 = meilleure valeur du ${n.bareme}.`,
      impact: `Calculée sur :<br/>${detail}`,
    };
  });
}

/**
 * Synthèse matérielle (4 indicateurs majeurs pour le panneau sticky droit).
 */
export function genererSpecsSynthese(product, productType) {
  const type = resolveType(productType || product?.productType);
  if (!type || !product) return [];

  if (type === 'cpu') {
    return [
      { label: 'Cœurs / Threads', val: `${product.cores || '—'} / ${product.threads || '—'}` },
      { label: 'Fréquence turbo', val: product.max_freq_ghz ? `${product.max_freq_ghz} GHz` : '—' },
      { label: 'TDP annoncé', val: product.tdp_w ? `${product.tdp_w} W` : '—' },
      {
        label: 'Geekbench 6 Multi',
        val: product.geekbench_multi ? `${formatValue(product.geekbench_multi)} pts` : '—',
      },
    ];
  }

  if (type === 'gpu') {
    return [
      {
        label: 'Mémoire vidéo (VRAM)',
        val: product.memory_gb
          ? `${product.memory_gb} Go ${product.memory_type || ''}`.trim()
          : '—',
      },
      { label: 'Unités de calcul', val: product.cores ? `${formatValue(product.cores)}` : '—' },
      { label: 'TDP annoncé', val: product.tdp_w ? `${product.tdp_w} W` : '—' },
      {
        label: '3DMark Time Spy',
        val: product.benchmark_3dmark ? `${formatValue(product.benchmark_3dmark)} pts` : '—',
      },
    ];
  }

  if (type === 'laptop') {
    return [
      {
        label: ['Autonomie', qualificatifOrigine(product.provenance?.battery_life_hours)]
          .filter(Boolean)
          .join(' '),
        val: product.battery_life_hours ? `${product.battery_life_hours} h` : '—',
      },
      {
        label: 'Luminosité écran',
        val: product.display_brightness_nits ? `${product.display_brightness_nits} nits` : '—',
      },
      { label: 'Mémoire vive', val: product.ram_gb ? `${product.ram_gb} Go RAM` : '—' },
      {
        label: 'Geekbench 6 Multi',
        val: product.geekbench_multi ? `${formatValue(product.geekbench_multi)} pts` : '—',
      },
    ];
  }

  if (type === 'telephone') {
    return [
      {
        label: 'Diagonale d’écran',
        val: product.display_size ? `${product.display_size} pouces` : '—',
      },
      {
        label: 'Batterie interne',
        val: product.battery_mah ? `${formatValue(product.battery_mah)} mAh` : '—',
      },
      { label: 'Mémoire vive', val: product.ram_gb ? `${product.ram_gb} Go RAM` : '—' },
      {
        label: 'Score de performance',
        val: formatValue(product.antutu_score || product.geekbench_multi)
          ? `${formatValue(product.antutu_score || product.geekbench_multi)} pts`
          : '—',
      },
    ];
  }

  return [];
}

/**
 * Construit les groupes techniques complets de la fiche avec sources citées.
 */
export function genererDatasheet(product, productType) {
  const type = resolveType(productType || product?.productType);
  if (!type || !product) return [];

  const groupesDef = SPEC_GROUPS[type] || [];

  return groupesDef.map(g => ({
    titre: g.group,
    lignes: g.rows.map(r => {
      const brute = product[r.key];
      const valFormatee = formatValue(brute, r.unit);
      const prov = product.provenance?.[r.key];
      const sourceDecrite = decrireSource(prov);

      // Pas de source par défaut : attribuer une valeur à NanoReview ou au
      // constructeur sans l'avoir relevée là serait inventer une provenance.
      // Une valeur sans source le dit.
      const source = sourceDecrite;

      return {
        cle: r.key,
        nom: r.label,
        aide: AIDES_SPEC[r.key] || 'Caractéristique issue de la fiche technique.',
        val: valFormatee || 'Non communiqué',
        // Une source est attendue pour une mesure chiffrée renseignée ; ni le
        // nom d'un processeur, ni une valeur absente n'en portent.
        sourceAttendue: Boolean(valFormatee) && criteresDe(type).some(cr => cr.key === r.key),
        source,
      };
    }),
  }));
}
