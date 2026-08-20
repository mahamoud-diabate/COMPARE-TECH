import React from 'react';

/**
 * Apparition d'une page.
 *
 * Auparavant assurée par framer-motion, pour une seule transition d'entrée
 * jouée sans <AnimatePresence> — la variante `exit` déclarée n'a donc jamais
 * pu s'exécuter. Une animation CSS rend exactement le même effet et retire
 * une dépendance de plus de 100 Ko du bundle initial.
 *
 * L'animation est neutralisée si l'utilisateur a demandé de réduire les
 * animations (voir `prefers-reduced-motion` dans index.css).
 */
const AnimatedPage = ({ children }) => (
  <div className="nr-page-enter">{children}</div>
);

export default AnimatedPage;
