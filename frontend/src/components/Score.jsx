import React from 'react';
import { scoreVar, scoreGrade } from '../utils/scores';

/**
 * Barre de résultat : nom, écart relatif, valeur, filet de progression.
 *
 * `percent` est la longueur du filet (0-100). En comparaison, on la calcule
 * par rapport au meilleur des produits affichés et non par rapport à un
 * plafond théorique : sinon deux produits proches donnent deux filets
 * quasi identiques et la comparaison ne se voit plus.
 *
 * Toutes les barres partagent la même couleur. Colorer par produit ajoutait
 * une clé de lecture à mémoriser alors que le nom figure déjà en tête de
 * chaque ligne ; ce qui distingue les produits, c'est l'écart annoncé et le
 * remplissage du carré de note, pas la teinte.
 */
export function ScoreBar({ name, value, unit, percent = 0, diff = null, muted = false }) {
  const width = Math.max(0, Math.min(100, Number(percent) || 0));

  return (
    <div className="nr-score-bar">
      <div className="nr-score-bar-name">
        {name}
        {diff ? <span className="nr-score-bar-diff">+{diff} %</span> : null}
      </div>
      <div className="nr-score-bar-result">
        <span className="nr-score-bar-result-number">{value}</span>
        {unit ? <span className="nr-score-bar-result-unit">{unit}</span> : null}
      </div>
      <div className="nr-score-bar-line">
        <div
          className={`nr-score-bar-line-filled${muted ? ' is-muted' : ''}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

/** Carré de note du bloc « Évaluation » : plein pour celui qui mène. */
export function ScoreSquare({ value, lead = false }) {
  return (
    <span className={`nr-score-square${lead ? ' is-lead' : ''}`}>
      {value === null || value === undefined ? 'n/d' : value}
    </span>
  );
}

/** Pastille « 83 | sur 100 » utilisée en tête de fiche et de comparatif. */
export function ScoreChip({ score, label = 'sur 100' }) {
  const color = scoreVar(score);
  return (
    <span className="nr-score-chip">
      <span className="nr-score-chip-num" style={{ background: color }}>
        {score > 0 ? score : '—'}
      </span>
      <span className="nr-score-chip-outof" style={{ borderColor: color }}>
        {label}
      </span>
    </span>
  );
}

/**
 * Note d'un classement : boîte contourée à la couleur du grade, suivie de la
 * lettre. Le chiffre situe précisément, la lettre situe d'un coup d'œil sans
 * avoir à connaître l'échelle.
 */
export function ScoreBox({ score }) {
  const { letter, variable } = scoreGrade(score);
  return (
    <span style={{ color: variable, whiteSpace: 'nowrap' }}>
      <span className="nr-score-box">{score > 0 ? score : '—'}</span>
      {letter && <span className="nr-score-grade">{letter}</span>}
    </span>
  );
}

export default ScoreBar;
