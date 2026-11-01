/*
 * Note sur 100 d'un produit, et le détail de son calcul.
 *
 * Les formules sont décrites en données plutôt qu'écrites en code. C'est ce
 * qui permet au site d'afficher le calcul, terme par terme, sous chaque note :
 * le total et son explication sortent de la même table, ils ne peuvent donc
 * pas diverger. Un comparateur qui montre « 88/100 » sans montrer d'où ça
 * vient demande qu'on lui fasse confiance ; celui-ci s'en dispense.
 *
 * Depuis le 31 octobre 2026, la note se calcule comme les notes par usage
 * (shared/usages.js) : chaque mesure est rapportée à la référence du BARÈME
 * VERSIONNÉ (100 = meilleure valeur du catalogue d'octobre 2026), puis les
 * mesures se combinent par MOYENNE GÉOMÉTRIQUE pondérée. Les anciens plafonds
 * fixes saturaient (la RTX 4090 dépassait celui des GPU et restait bloquée à
 * 100, à égalité avec toute carte plus rapide) ; une note au-delà de 100 dit
 * maintenant, honnêtement, qu'il est temps de publier un barème v2.
 *
 * Les plafonds de `criteres.js` ne servent plus qu'aux échelles graphiques
 * bornées (radar, barres).
 *
 * Module partagé : le navigateur l'utilise pour afficher les notes, le serveur
 * pourra l'utiliser pour les servir (verdict IA, aperçus de partage).
 */

import { resolveType } from './criteres.js';
import { BAREME } from './usages.js';

const terme = (type, key, label, poids) => {
  const reference = BAREME.references[type]?.[key];
  if (!(reference > 0)) {
    throw new Error(`${type}.${key} : pas de référence au barème ${BAREME.version}.`);
  }
  // `max` reste exposé pour les affichages existants : c'est la référence.
  return { key, label, reference, max: reference, poids };
};

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
 * @returns {{total: number, termes: Array, complet: boolean, formule: object|null, bareme: string}}
 *   `termes` porte, pour chaque critère : la valeur mesurée, la référence du
 *   barème, le poids et l'indice (valeur / référence × 100). `complet` dit si
 *   tous les critères exigés sont renseignés. `total` vaut 0 quand la note
 *   n'est pas calculable : jamais une contre-performance, une donnée absente.
 */
export function explainScore(product, productType) {
  const type = resolveType(productType || product?.productType);
  const formule = type ? FORMULES[type] : null;
  const bareme = `barème ${BAREME.version} (${BAREME.date})`;

  if (!product || !formule) {
    return { total: 0, termes: [], complet: false, formule: null, bareme };
  }

  const termes = formule.termes.map(t => {
    const valeur = Number(product[t.key]);
    const mesuree = Number.isFinite(valeur) && valeur > 0 ? valeur : null;
    const indice = mesuree === null ? null : (mesuree / t.reference) * 100;
    return { ...t, valeur: mesuree, indice };
  });

  const presents = termes.filter(t => t.valeur !== null);
  const complet = presents.length === termes.length;

  // Une donnée manquante ne vaut pas zéro : sans elle, la note n'est pas
  // calculable, et un 0 la ferait passer pour une contre-performance mesurée.
  const calculable = formule.exigeTout ? complet : presents.length > 0;
  if (!calculable) return { total: 0, termes, complet, formule, bareme };

  // Moyenne géométrique pondérée, sur les termes présents (poids renormalisés
  // quand la formule n'exige pas tout).
  const poidsTotal = presents.reduce((s, t) => s + t.poids, 0);
  const log = presents.reduce(
    (s, t) => s + (t.poids / poidsTotal) * Math.log(t.valeur / t.reference),
    0
  );
  return { total: Math.round(100 * Math.exp(log)), termes, complet, formule, bareme };
}
