/*
 * Note sur 100 d'un produit.
 *
 * Les formules et leur calcul détaillé (`explainScore`) vivent dans
 * `shared/formules.js`, partagé avec le backend. Ce fichier garde ce qui ne
 * concerne que l'affichage : notes-lettres, couleurs, rang dans la catégorie.
 */

import { explainScore } from '../../../shared/formules.js';

export { explainScore, FORMULES } from '../../../shared/formules.js';

/**
 * Note d'un produit, sur 100. 0 signifie « non mesurable », jamais « mauvais ».
 *
 * Toujours calculée, jamais lue sur le document : un champ `score` imposé à la
 * main contournerait la formule publiée — exactement ce qu'on reproche aux
 * comparateurs opaques. (Ce raccourci existait ; aucun schéma ne stockait ce
 * champ, il n'était donc jamais utilisé.)
 */
export const getProductScore = (product, typeOverride) => explainScore(product, typeOverride).total;

// --- Compatibilité : les quatre formules nommées, dérivées de la même table.
export const calculateCpuScore = cpu => explainScore(cpu, 'cpu').total;
export const calculateGpuScore = gpu => explainScore(gpu, 'gpu').total;
export const calculateLaptopScore = laptop => explainScore(laptop, 'laptop').total;
export const calculateTelephoneScore = tel => explainScore(tel, 'telephone').total;

/*
 * Note-lettre associée à un score.
 *
 * Une lettre à côté du chiffre situe le produit sans qu'on ait à connaître
 * l'échelle. Les seuils sont calés sur la distribution réelle du catalogue, et
 * les couleurs sont dérivées de la palette du projet : progression monotone
 * vert → ambre → rouge, contrastes AA dans les deux thèmes.
 */
const GRADES = [
  { min: 90, letter: 'A+', variable: 'var(--ct-g-ap)' },
  { min: 70, letter: 'A', variable: 'var(--ct-g-a)' },
  { min: 50, letter: 'B', variable: 'var(--ct-g-b)' },
  { min: 30, letter: 'C', variable: 'var(--ct-g-c)' },
  { min: 1, letter: 'D', variable: 'var(--ct-g-d)' },
];

const NO_GRADE = { letter: null, variable: 'var(--ct-g-none)' };

export const scoreGrade = score => {
  if (!score || score <= 0) return NO_GRADE;
  return GRADES.find(grade => score >= grade.min) || NO_GRADE;
};

/** Raccourci : la seule couleur, pour un fond ou une bordure. */
export const scoreVar = score => scoreGrade(score).variable;

/** Conservé pour les appelants historiques (variantes Bootstrap). */
export const getScoreColor = score => {
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
  const mediane =
    notes.length % 2 ? notes[milieu] : Math.round((notes[milieu - 1] + notes[milieu]) / 2);

  // Rang au sens sportif : deux produits à égalité partagent le même rang.
  const rang = notes.filter(n => n > note).length + 1;

  return { rang, total: notes.length, mediane, notes };
}
