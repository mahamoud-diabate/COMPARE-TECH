/*
 * Note sur 100 d'un produit, et le détail de son calcul.
 *
 * Les formules sont décrites en données plutôt qu'écrites en code. C'est ce
 * qui permet au site d'afficher le calcul, terme par terme, sous chaque note :
 * le total et son explication sortent de la même table, ils ne peuvent donc
 * pas diverger. Un comparateur qui montre « 88/100 » sans montrer d'où ça
 * vient demande qu'on lui fasse confiance ; celui-ci s'en dispense.
 *
 * Les plafonds ne sont plus écrits ici : ils viennent de `criteres.js`, où le
 * radar et les barres de benchmark les lisent aussi. Une seule valeur par
 * critère, donc une seule échelle partout.
 *
 * Module partagé : le navigateur l'utilise pour afficher les notes, le serveur
 * pourra l'utiliser pour les servir (verdict IA, aperçus de partage).
 */

import { plafond, resolveType } from './criteres.js';

const terme = (type, key, label, poids) => ({ key, label, max: plafond(type, key), poids });

export const FORMULES = Object.freeze({
  cpu: {
    // Le multi-cœur pèse plus lourd : c'est lui qui décide sur les usages qui
    // saturent un processeur (rendu, compilation). Les deux sont exigés — une
    // note calculée sur 70 % de la formule ne serait pas comparable aux autres.
    exigeTout: true,
    termes: [
      terme('cpu', 'geekbench_multi', 'Geekbench 6 multi-cœur', 0.7),
      terme('cpu', 'geekbench_single', 'Geekbench 6 mono-cœur', 0.3),
    ],
  },
  gpu: {
    termes: [terme('gpu', 'benchmark_3dmark', '3DMark', 1)],
  },
  laptop: {
    termes: [terme('laptop', 'geekbench_multi', 'Geekbench 6 multi-cœur', 1)],
  },
  telephone: {
    // Geekbench 6 plutôt qu'AnTuTu, pour une raison de mesure et non de goût :
    // AnTuTu teste Android en Vulkan et iOS en Metal, deux API graphiques
    // différentes — les scores ne sont pas comparables d'une plateforme à
    // l'autre. Sur le catalogue relevé, l'A18 Pro sortait 7e derrière quatre
    // Snapdragon, ce qui est faux. Geekbench exécute les mêmes charges partout.
    //
    // Même pondération que les processeurs, et pour la même raison : le
    // multi-cœur décide sur les usages qui saturent la puce.
    exigeTout: true,
    termes: [
      terme('telephone', 'geekbench_multi', 'Geekbench 6 multi-cœur', 0.7),
      terme('telephone', 'geekbench_single', 'Geekbench 6 mono-cœur', 0.3),
    ],
  },
});

/**
 * Détail du calcul d'une note.
 *
 * @returns {{total: number, termes: Array, complet: boolean, formule: object|null}}
 *   `termes` porte, pour chaque critère : la valeur mesurée, le plafond, le
 *   poids et les points effectivement apportés. `complet` dit si tous les
 *   critères exigés sont renseignés.
 */
export function explainScore(product, productType) {
  const type = resolveType(productType || product?.productType);
  const formule = type ? FORMULES[type] : null;

  if (!product || !formule) {
    return { total: 0, termes: [], complet: false, formule: null };
  }

  const termes = formule.termes.map(t => {
    const valeur = Number(product[t.key]);
    const mesuree = Number.isFinite(valeur) && valeur > 0 ? valeur : null;
    const points = mesuree === null ? 0 : (mesuree / t.max) * 100 * t.poids;
    return { ...t, valeur: mesuree, points };
  });

  const manquants = termes.filter(t => t.valeur === null);
  const complet = manquants.length === 0;

  // Une donnée manquante ne vaut pas zéro : sans elle, la note n'est pas
  // calculable, et un 0 la ferait passer pour une contre-performance mesurée.
  const calculable = formule.exigeTout ? complet : manquants.length < termes.length;
  const brut = termes.reduce((somme, t) => somme + t.points, 0);
  const total = calculable ? Math.min(100, Math.round(brut)) : 0;

  return { total, termes, complet, formule };
}
