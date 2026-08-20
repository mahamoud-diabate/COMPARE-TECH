import React from 'react';
import './ThemeToggle.css';

/**
 * Bouton de bascule de thème au design de cylindre 3D minimaliste.
 * Reproduit la perspective cylindrique (fond blanc/face noire en sombre, fond gris/face blanche en clair).
 */
export function ThemeToggle({ theme, toggleTheme }) {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      onClick={toggleTheme}
      className={`nr-cylinder-toggle ${isDark ? 'is-dark' : 'is-light'}`}
    >
      <span className="nr-cylinder-pill">
        <span className="nr-cylinder-face" />
      </span>
    </button>
  );
}

export default ThemeToggle;
