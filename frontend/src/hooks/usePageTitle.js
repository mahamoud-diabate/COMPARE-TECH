import { useEffect } from 'react';

const SUFFIX = 'CompareTech';

// Description de repli, lue une fois au chargement : c'est celle d'index.html.
// Sans elle, une page qui n'en fournit pas garderait celle de la page
// précédente — un lien partagé depuis la page 404 annonçait le comparatif
// qu'on venait de quitter.
const DEFAULT_DESCRIPTION =
  typeof document === 'undefined'
    ? ''
    : document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

/**
 * Titre et description de la page courante.
 *
 * Toutes les pages partageaient le titre statique de `index.html` : dans
 * l'historique du navigateur, un onglet épinglé ou un lien partagé, un
 * comparatif était indiscernable d'une fiche produit ou de l'accueil.
 *
 * Mise à jour côté client uniquement : cela sert la navigation, les favoris et
 * le partage, mais pas un robot qui n'exécute pas JavaScript. Un vrai gain de
 * référencement demanderait un rendu côté serveur, hors de portée d'un build
 * Vite statique.
 */
export function usePageTitle(title, description) {
  useEffect(() => {
    if (!title) return;

    document.title = `${title} | ${SUFFIX}`;

    const tag = document.querySelector('meta[name="description"]');
    if (tag) tag.setAttribute('content', description || DEFAULT_DESCRIPTION);
  }, [title, description]);
}

export default usePageTitle;
