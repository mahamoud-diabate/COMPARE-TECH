import React from 'react';
import { SERIES } from '../../utils/marche';

/*
 * Identité visuelle d'un produit comparé : couleur ET forme (charte
 * docs/DESIGN.md). Premier produit ● plein, deuxième ○ anneau, troisième
 * ◆ losange — lisible même sans distinguer les couleurs.
 */

/** Pastille HTML, à côté d'un nom. */
export function Glyphe({ index }) {
  return <i className={`ct-glyphe ct-glyphe-${index % 3}`} aria-hidden="true" />;
}

/** Même repère, dessiné dans un SVG. */
export function RepereSvg({ x, y, index, r = 5 }) {
  const couleur = SERIES[index % 3];
  if (index % 3 === 0) {
    return <circle cx={x} cy={y} r={r} fill={couleur} stroke="var(--ct-card)" strokeWidth="1.5" />;
  }
  if (index % 3 === 1) {
    return (
      <circle cx={x} cy={y} r={r - 0.4} fill="var(--ct-card)" stroke={couleur} strokeWidth="2.5" />
    );
  }
  const d = r + 0.8;
  return (
    <polygon
      points={`${x},${y - d} ${x + d},${y} ${x},${y + d} ${x - d},${y}`}
      fill={couleur}
      stroke="var(--ct-card)"
      strokeWidth="1.4"
    />
  );
}
