/*
 * Note sur 100 d'un produit, et le détail de son calcul.
 *
 * Les formules sont décrites en données plutôt qu'écrites en code. C'est ce
 * qui permet au site d'afficher le calcul, terme par terme, sous chaque note :
 * le total et son explication sortent de la même table, ils ne peuvent donc
 * pas diverger. Un comparateur qui montre « 88/100 » sans montrer d'où ça
 * vient demande qu'on lui fasse confiance ; celui-ci s'en dispense.
 *
 * `max` est le plafond de référence de la catégorie : la valeur au-delà de
 * laquelle on considère le critère saturé. Il ne change pas le classement
 * entre deux produits, il fixe l'échelle. Les mêmes plafonds servent aux axes
 * du radar (voir radarAxes.js).
 */

const FORMULES = {
  cpu: {
    // Le multi-cœur pèse plus lourd : c'est lui qui décide sur les usages qui
    // saturent un processeur (rendu, compilation). Les deux sont exigés — une
    // note calculée sur 70 % de la formule ne serait pas comparable aux autres.
    exigeTout: true,
    termes: [
      { key: 'geekbench_multi', label: 'Geekbench 6 multi-cœur', max: 29000, poids: 0.7 },
      { key: 'geekbench_single', label: 'Geekbench 6 mono-cœur', max: 3500, poids: 0.3 },
    ],
  },
  gpu: {
    termes: [{ key: 'benchmark_3dmark', label: '3DMark', max: 35000, poids: 1 }],
  },
  laptop: {
    termes: [{ key: 'geekbench_multi', label: 'Geekbench 6 multi-cœur', max: 26000, poids: 1 }],
  },
  telephone: {
    termes: [{ key: 'antutu_score', label: 'AnTuTu', max: 3200000, poids: 1 }],
  },
};

const typeDe = (productType) => {
  const type = String(productType || '');
  return Object.keys(FORMULES).find(cle => type.includes(cle)) || null;
};

/**
 * Détail du calcul d'une note.
 *
 * @returns {{total: number, termes: Array, complet: boolean, formule: object|null}}
 *   `termes` porte, pour chaque critère : la valeur mesurée, le plafond, le
 *   poids et les points effectivement apportés. `complet` dit si tous les
 *   critères exigés sont renseignés.
 */
export function explainScore(product, productType) {
  const type = typeDe(productType || product?.productType);
  const formule = type ? FORMULES[type] : null;

  if (!product || !formule) {
    return { total: 0, termes: [], complet: false, formule: null };
  }

  const termes = formule.termes.map(terme => {
    const valeur = Number(product[terme.key]);
    const mesuree = Number.isFinite(valeur) && valeur > 0 ? valeur : null;
    const points = mesuree === null ? 0 : (mesuree / terme.max) * 100 * terme.poids;
    return { ...terme, valeur: mesuree, points };
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

/**
 * Note d'un produit, sur 100. 0 signifie « non mesurable », jamais « mauvais ».
 * Un `score` déjà porté par le document l'emporte sur le calcul.
 */
export const getProductScore = (product, typeOverride) => {
  if (product?.score) return product.score;
  return explainScore(product, typeOverride).total;
};

// --- Compatibilité : les quatre formules nommées, dérivées de la même table.
export const calculateCpuScore = (cpu) => explainScore(cpu, 'cpu').total;
export const calculateGpuScore = (gpu) => explainScore(gpu, 'gpu').total;
export const calculateLaptopScore = (laptop) => explainScore(laptop, 'laptop').total;
export const calculateTelephoneScore = (tel) => explainScore(tel, 'telephone').total;

/*
 * Note-lettre associée à un score.
 *
 * Une lettre à côté du chiffre situe le produit sans qu'on ait à connaître
 * l'échelle. Les seuils sont calés sur la distribution réelle du catalogue,
 * et les couleurs viennent de la palette du projet — pas d'une pipette posée
 * sur un site voisin.
 */
const GRADES = [
  { min: 90, letter: 'A+', variable: 'var(--nr-g-ap)' },
  { min: 70, letter: 'A', variable: 'var(--nr-g-a)' },
  { min: 50, letter: 'B', variable: 'var(--nr-g-b)' },
  { min: 30, letter: 'C', variable: 'var(--nr-g-c)' },
  { min: 1, letter: 'D', variable: 'var(--nr-g-d)' },
];

const NO_GRADE = { letter: null, variable: 'var(--nr-g-none)' };

export const scoreGrade = (score) => {
  if (!score || score <= 0) return NO_GRADE;
  return GRADES.find(grade => score >= grade.min) || NO_GRADE;
};

/** Raccourci : la seule couleur, pour un fond ou une bordure. */
export const scoreVar = (score) => scoreGrade(score).variable;

/** Conservé pour les appelants historiques (variantes Bootstrap). */
export const getScoreColor = (score) => {
  if (!score || score === 0) return 'secondary';
  if (score >= 90) return 'success';
  if (score >= 70) return 'primary';
  if (score >= 50) return 'warning';
  return 'danger';
};

/**
 * Situe un produit dans la distribution des notes de sa catégorie.
 *
 * Une note isolée ne dit rien : 88/100 est excellent dans une catégorie où la
 * médiane est à 50, banal dans une où elle est à 85. Le rang et la médiane
 * donnent au chiffre l'échelle qui lui manque.
 *
 * Les produits non mesurables sont écartés du calcul — les compter à 0
 * tirerait la médiane vers le bas et flatterait tout le monde.
 *
 * @returns {{rang: number, total: number, mediane: number, notes: number[]}|null}
 */
export function rankInCategory(product, peers, productType) {
  const notes = (peers || [])
    .map(p => getProductScore(p, productType))
    .filter(note => note > 0)
    .sort((a, b) => b - a);

  const note = getProductScore(product, productType);
  if (note <= 0 || notes.length < 2) return null;

  const milieu = Math.floor(notes.length / 2);
  const mediane = notes.length % 2
    ? notes[milieu]
    : Math.round((notes[milieu - 1] + notes[milieu]) / 2);

  // Rang au sens sportif : deux produits à égalité partagent le même rang.
  const rang = notes.filter(n => n > note).length + 1;

  return { rang, total: notes.length, mediane, notes };
}
