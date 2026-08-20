// --- FORMULES DE CALCUL (Recalibrage 2025) ---

export const calculateCpuScore = (cpu) => {
  if (!cpu.geekbench_single || !cpu.geekbench_multi) return 0;
  const multi = (cpu.geekbench_multi / 29000) * 100;
  const single = (cpu.geekbench_single / 3500) * 100;
  let total = Math.round((multi * 0.7) + (single * 0.3));
  return total > 100 ? 100 : total;
};

export const calculateGpuScore = (gpu) => {
  if (!gpu.benchmark_3dmark) return 0;
  let score = Math.round((gpu.benchmark_3dmark / 35000) * 100);
  return score > 100 ? 100 : score;
};

export const calculateTelephoneScore = (tel) => {
  if (!tel.antutu_score) return 0;
  let score = Math.round((tel.antutu_score / 3200000) * 100);
  return score > 100 ? 100 : score;
};

export const calculateLaptopScore = (laptop) => {
  if (!laptop.geekbench_multi) return 0;
  let score = Math.round((laptop.geekbench_multi / 26000) * 100);
  return score > 100 ? 100 : score;
};

// --- C'EST CETTE FONCTION QUI MANQUAIT ---
export const getScoreColor = (score) => {
  if (!score || score === 0) return 'secondary';
  if (score >= 90) return 'success'; // Vert pour l'excellence
  if (score >= 70) return 'primary'; // Bleu pour le très bon
  if (score >= 50) return 'warning'; // Jaune pour le moyen
  return 'danger'; // Rouge pour le faible
};

// Fonction principale de distribution
export const getProductScore = (product, typeOverride) => {
    if (product.score) return product.score;
    const type = typeOverride || product.productType || '';
    
    if (type.includes('cpu')) return calculateCpuScore(product);
    if (type.includes('gpu')) return calculateGpuScore(product);
    if (type.includes('telephone')) return calculateTelephoneScore(product);
    if (type.includes('laptop')) return calculateLaptopScore(product);
    return 0;
};
/*
 * Note-lettre associee a un score 0-100.
 *
 * Reprend le systeme du comparateur de reference : une lettre a cote du
 * chiffre situe le produit d'un coup d'oeil, la ou un nombre seul demande de
 * connaitre l'echelle. Les seuils sont en revanche adaptes a la distribution
 * de nos scores : ceux de la reference placeraient presque tout le catalogue
 * en « A », ce qui ne distinguerait plus rien.
 *
 * `variable` renvoie une variable CSS, donc une couleur qui suit le theme
 * sans que le composant ait a le savoir. Utilisable en style inline React.
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
