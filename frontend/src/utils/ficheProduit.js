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

import { SPEC_GROUPS, resolveType, formatValue, toNumber } from './specs.js';
import { decrireSource, qualificatifOrigine } from './marche.js';
import { criteresDe } from '../../../shared/criteres.js';

const AIDES_SPEC = {
  geekbench_multi: 'Mesure standardisée en calcul parallèle lourd (montage, compression)',
  geekbench_single: 'Réactivité brute sur une seule tâche à la fois',
  cores: 'Nombre de cœurs physiques de calcul matériels',
  threads: 'Fils d’exécution simultanés (multithreading)',
  max_freq_ghz: 'Fréquence d’horloge maximale sous charge brève (Boost)',
  base_freq_ghz: 'Fréquence d’horloge garantie en utilisation continue',
  tdp_w: 'Enveloppe thermique et consommation maximale en watts',
  socket: 'Plateforme de la carte mère : détermine les évolutions possibles',
  annee_sortie: 'Année de commercialisation annoncée par le constructeur',
  cache_l3_mo: 'Mémoire cache partagée ; aide surtout en jeu, pas partout',
  cinebench_2024_multi: 'Rendu 3D sur tous les cœurs, charge longue (Cinebench 2024)',
  benchmark_3dmark: 'Score de référence sur le banc graphique 3DMark Time Spy',
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

/**
 * Génère les 3 profils d'usage commutables pour un produit donné.
 */
export function genererUsages(product, productType) {
  const type = resolveType(productType || product?.productType);
  if (!type || !product) return [];

  if (type === 'cpu') {
    const multi = toNumber(product.geekbench_multi);
    const maxFreq = toNumber(product.max_freq_ghz);
    const tdp = toNumber(product.tdp_w);
    const cores = product.cores || 8;
    const threads = product.threads || 16;

    let impactTdp =
      'Un <strong>bon ventirad classique suffit</strong> ; aucun kit de refroidissement liquide encombrant n’est imposé.';
    if (tdp && tdp > 150) {
      impactTdp =
        'Exige un <strong>refroidissement liquide performant (AIO 280/360 mm)</strong> et un boîtier spacieux pour dissiper la chaleur.';
    } else if (tdp && tdp <= 65) {
      impactTdp =
        'Très sobre thermiquement : un <strong>refroidisseur compact et silencieux suffit</strong>, parfait pour petit boîtier.';
    }

    return [
      {
        id: 'gaming',
        titre: 'Jeu vidéo & Réactivité',
        specTitre: 'Fréquence turbo & Vitesse de pointe',
        specVal: maxFreq
          ? `${maxFreq} GHz`
          : product.geekbench_single
            ? `${formatValue(product.geekbench_single)} pts`
            : `${cores} cœurs`,
        resume:
          'Fréquence de crête pour l’exécution rapide des instructions sur les cœurs principaux.',
        impact:
          'Maintient des <strong>taux d’images par seconde élevés et stables</strong> sur les titres exigeants et une réactivité instantanée en bureautique.',
      },
      {
        id: 'creation',
        titre: 'Calcul lourd & Multitâche',
        specTitre: 'Score Geekbench 6 Multi',
        specVal: multi ? `${formatValue(multi)} pts` : `${cores} cœurs / ${threads} threads`,
        resume: `${cores} cœurs physiques et ${threads} fils d’exécution pour le rendu parallèle et la compression.`,
        impact:
          multi && multi >= 20000
            ? 'Excellentes prestations en <strong>rendu 3D lourd, montage vidéo 4K et compilation</strong> intensive.'
            : 'Très fluide pour le travail créatif et la retouche, idéal pour le multitâche quotidien.',
      },
      {
        id: 'thermique',
        titre: 'Refroidissement & Boîtier',
        specTitre: 'Enveloppe thermique continue',
        specVal: tdp ? `${tdp} W TDP` : 'Standard',
        resume: 'Consommation électrique et dégagement thermique sous forte sollicitation.',
        impact: impactTdp,
      },
    ];
  }

  if (type === 'gpu') {
    const mem = toNumber(product.memory_gb);
    const memType = product.memory_type || 'GDDR6';
    const score3d = toNumber(product.benchmark_3dmark);
    const tdp = toNumber(product.tdp_w);

    let impact3d =
      'Permet de jouer avec <strong>toutes les options graphiques poussées au maximum</strong> de manière parfaitement fluide.';
    if (score3d && score3d >= 30000) {
      impact3d =
        'Délivre une expérience en <strong>4K native avec Ray Tracing maximal</strong> sans aucun compromis de fluidité.';
    } else if (score3d && score3d >= 18000) {
      impact3d =
        'Idéale pour le <strong>jeu en 1440p ultra à haute fréquence de rafraîchissement</strong> et 4K confort.';
    }

    let impactGpuTdp =
      'Une <strong>alimentation de 650 W à 750 W</strong> est recommandée avec un boîtier correctement aéré.';
    if (tdp && tdp >= 350) {
      impactGpuTdp =
        'Exige un <strong>bloc d’alimentation d’au moins 850 W à 1000 W</strong> et un grand boîtier avec un flux d’air vigoureux.';
    } else if (tdp && tdp <= 200) {
      impactGpuTdp =
        'Consommation modérée : fonctionne sur une <strong>alimentation standard de 550 W</strong> dans un boîtier compact.';
    }

    return [
      {
        id: 'rendu3d',
        titre: 'Rendu 3D & Jeu vidéo',
        specTitre: '3DMark Time Spy & Architecture',
        specVal: score3d
          ? `${formatValue(score3d)} pts`
          : mem
            ? `${mem} Go ${memType}`
            : 'Carte dédiée',
        resume: 'Bande passante mémoire élevée et unités dédiées au calcul géométrique complexe.',
        impact: impact3d,
      },
      {
        id: 'ia',
        titre: 'Intelligence Artificielle & Création',
        specTitre: 'Capacité mémoire vidéo (VRAM)',
        specVal: mem ? `${mem} Go ${memType}` : 'VRAM dédiée',
        resume:
          'Volume de mémoire indispensable pour charger de grands modèles IA ou scènes 3D sans déborder en RAM.',
        impact:
          mem && mem >= 16
            ? 'Adaptée à <strong>l’inférence locale de modèles LLM et au montage 4K/8K</strong> sans étouffement mémoire.'
            : 'Convient très bien pour la création graphique assistée et le traitement vidéo standard.',
      },
      {
        id: 'alim',
        titre: 'Alimentation & Encombrement',
        specTitre: 'Enveloppe thermique continue',
        specVal: tdp ? `${tdp} W TDP` : 'Puissance standard',
        resume: 'Consommation maximale absorbée sous pleine charge 3D continue.',
        impact: impactGpuTdp,
      },
    ];
  }

  if (type === 'laptop') {
    const bat = toNumber(product.battery_life_hours);
    const nits = toNumber(product.display_brightness_nits);
    const multi = toNumber(product.geekbench_multi);
    const ram = product.ram_gb || 16;

    return [
      {
        id: 'mobilite',
        titre: 'Mobilité & Travail nomade',
        specTitre: ['Autonomie', qualificatifOrigine(product.provenance?.battery_life_hours)]
          .filter(Boolean)
          .join(' '),
        specVal: bat ? `${bat} heures` : 'Non communiquée',
        // La phrase ne décrit le protocole que si la source le nomme : sans
        // cela, « mesurée en navigation Wi-Fi » serait une affirmation de plus.
        resume:
          product.provenance?.battery_life_hours?.protocole === 'notebookcheck-wifi'
            ? 'Endurance mesurée par Notebookcheck en navigation web continue sur Wi-Fi.'
            : 'Durée sur batterie, telle que donnée par la source citée.',
        impact:
          bat && bat >= 14
            ? 'Permet une <strong>journée complète de travail loin de toute prise</strong> sans transporter de chargeur.'
            : 'Assure une autonomie confortable pour les cours et réunions en déplacement.',
      },
      {
        id: 'ecran',
        titre: 'Écran & Confort visuel',
        specTitre: 'Luminance maximale de la dalle',
        specVal: nits ? `${nits} nits` : 'Dalle haute définition',
        resume: 'Luminosité de l’écran pour compenser les reflets de lumière naturelle.',
        impact:
          nits && nits >= 400
            ? 'Garantit une <strong>lecture très confortable en extérieur ou près d’une baie vitrée</strong>.'
            : 'Confort optimal en environnement intérieur et bureaux éclairés.',
      },
      {
        id: 'polyvalence',
        titre: 'Bureautique avancée & Multitâche',
        specTitre: 'Processeur & Mémoire vive',
        specVal: multi ? `${formatValue(multi)} pts` : `${ram} Go RAM`,
        resume: `${product.cpu_name || 'Processeur multi-cœur'} combiné à ${ram} Go de RAM pour un système fluide.`,
        impact: product.gpu_name
          ? 'Capable d’assumer <strong>le jeu 3D et le montage vidéo</strong> grâce à son circuit graphique dédié.'
          : 'Fluidité sans faille en multitâche bureautique, navigation lourde et visioconférence.',
      },
    ];
  }

  if (type === 'telephone') {
    const antutu = toNumber(product.antutu_score);
    const multi = toNumber(product.geekbench_multi);
    const bat = toNumber(product.battery_mah);
    const taille = toNumber(product.display_size);
    const ram = product.ram_gb || 8;

    return [
      {
        id: 'performance',
        titre: 'Performance globale & Réactivité',
        specTitre: 'Score AnTuTu / Geekbench',
        specVal: antutu
          ? `${formatValue(antutu)} pts`
          : multi
            ? `${formatValue(multi)} pts`
            : `${ram} Go RAM`,
        resume: `Puce ${product.cpu_name || 'haut de gamme'} associée à ${ram} Go de mémoire vive.`,
        impact:
          'Exécute n’importe quelle application ou jeu 3D <strong>sans aucun ralentissement perceptible</strong>.',
      },
      {
        id: 'batterie',
        titre: 'Autonomie & Batterie',
        specTitre: 'Capacité énergétique nominale',
        specVal: bat ? `${formatValue(bat)} mAh` : 'Grande batterie',
        resume: 'Réserve d’énergie pour alimenter le processeur et la dalle haute fréquence.',
        impact:
          bat && bat >= 4800
            ? 'Assure <strong>plus d’une journée et demie d’utilisation normale</strong> sans recharge intermédiaire.'
            : 'Couvre amplement une journée de travail et de communication complète.',
      },
      {
        id: 'ecran',
        titre: 'Format d’écran & Multimédia',
        specTitre: 'Diagonale de la dalle tactile',
        specVal: taille ? `${taille} pouces` : 'Grand écran',
        resume: 'Grande surface d’affichage adaptée à la vidéo, aux jeux et au multitâche.',
        impact:
          taille && taille >= 6.7
            ? 'Idéal pour le <strong>visionnage vidéo et les réseaux</strong>, mais gabarit imposant en poche.'
            : 'Format <strong>parfaitement maniable et agréable à une main</strong>.',
      },
    ];
  }

  return [];
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
      { label: 'Consommation (TDP)', val: product.tdp_w ? `${product.tdp_w} W` : '—' },
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
      { label: 'Consommation (TDP)', val: product.tdp_w ? `${product.tdp_w} W` : '—' },
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
