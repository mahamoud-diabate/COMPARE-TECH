import React from 'react';
import { Laptop, Smartphone, Lock } from 'lucide-react';
import { PNG, SVG } from '../utils/iconFiles';

/*
 * Icônes de l'interface.
 *
 * Deux sources, dans cet ordre de priorité :
 *  1. un fichier déposé dans `src/assets/icons/` (voir le LISEZ-MOI qui s'y
 *     trouve) ;
 *  2. à défaut, le tracé fourni ici.
 *
 * Un fichier absent ne casse rien : le repli prend le relais, ce qui permet de
 * remplacer les icônes une par une. La lecture du dossier vit dans
 * `utils/iconFiles.js`.
 *
 * Les fichiers déposés sont affichés TELS QUELS, couleurs comprises. C'est un
 * écart assumé à la règle « la couleur est réservée à la donnée » (DESIGN.md,
 * section 1) : ces icônes sont choisies pour leur apparence, pas générées.
 * Conséquence à connaître : elles ne suivent pas le thème — un dessin clair
 * restera clair sur fond sombre.
 */

const dimensionner = (source, size) =>
  source
    .replace(/\s(width|height)="[^"]*"/g, '')
    .replace(/<svg/, `<svg width="${size}" height="${size}" aria-hidden="true" focusable="false"`);

const base = (size) => ({
  xmlns: 'http://www.w3.org/2000/svg',
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
});

/*
 * Tracés de repli, dessinés pour le projet sur la grille de lucide (24×24,
 * trait de 2, extrémités arrondies) pour s'accorder aux icônes de la
 * bibliothèque utilisées ailleurs. Contrairement aux fichiers déposés, ils
 * suivent le thème.
 */
function GraphicsCard({ size }) {
  return (
    <svg {...base(size)}>
      <rect x="2" y="6" width="20" height="11" rx="2" />
      <circle cx="8" cy="11.5" r="2.4" />
      <circle cx="16" cy="11.5" r="2.4" />
      <path d="M6 17v2" />
      <path d="M18 17v2" />
    </svg>
  );
}

function Processor({ size }) {
  return (
    <svg {...base(size)}>
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
      <path d="M9.5 9.5h5v5h-5z" />
      <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
    </svg>
  );
}

const REPLIS = {
  cpu: Processor,
  gpu: GraphicsCard,
  laptop: ({ size }) => <Laptop size={size} strokeWidth={2} aria-hidden="true" />,
  phone: ({ size }) => <Smartphone size={size} strokeWidth={2} aria-hidden="true" />,
  admin: ({ size }) => <Lock size={size} strokeWidth={2} aria-hidden="true" />,
};

/**
 * Icône désignée par son nom (`cpu`, `gpu`, `laptop`, `phone`, `admin`).
 *
 * Purement décorative : le libellé qui l'accompagne porte le sens, l'icône est
 * donc masquée aux lecteurs d'écran (`alt=""` / `aria-hidden`).
 */
export function Icone({ nom, size = 16 }) {
  const png = PNG[nom];
  if (png) {
    return (
      <img
        className="ct-icone-img"
        src={png}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        // Décodage hors du fil principal : ces fichiers font 512 px, les
        // décoder de façon synchrone retarderait l'affichage du menu.
        //
        // Pas de `loading="lazy"` : le chargement différé repose sur
        // l'intersection avec la fenêtre, or ces icônes vivent dans un tiroir
        // hors écran. Elles n'apparaîtraient qu'après son ouverture, avec un
        // temps de latence visible — pour 16 px, le report ne rapporte rien.
        decoding="async"
      />
    );
  }

  const svg = SVG[nom];
  if (svg) {
    return (
      <span
        className="ct-icone"
        style={{ width: size, height: size }}
        dangerouslySetInnerHTML={{ __html: dimensionner(svg, size) }}
      />
    );
  }

  const Repli = REPLIS[nom];
  return Repli ? <Repli size={size} /> : null;
}

export default Icone;
