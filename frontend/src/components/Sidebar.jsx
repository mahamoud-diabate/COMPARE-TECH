import React, { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { Icone } from './icons';
import ranking from '../assets/icons/ranking.png';
import balance from '../assets/icons/compare.png';
import ThemeToggle from './ThemeToggle';

/*
 * Deux groupes, parce que le site fait deux choses distinctes que la barre
 * horizontale précédente présentait à l'identique :
 *  - comparer deux modèles précis (page de sélection puis face-à-face) ;
 *  - parcourir un classement complet.
 * « CPU » ne menait qu'au second ; on ne pouvait pas deviner que le premier
 * existait.
 */
/*
 * Une icône par catégorie de produit, la même dans les deux groupes.
 *
 * L'icône désigne la CHOSE, le titre du groupe désigne l'ACTION. Une version
 * précédente mettait quatre histogrammes identiques dans « Classements » :
 * répétée quatre fois de suite, une icône ne distingue plus rien. Ici, deux
 * lignes portant la même icône désignent bien le même produit.
 *
 * Le nom renvoie à `components/icons.jsx`, qui sert le fichier déposé dans
 * `assets/icons/` s'il existe, et un tracé de repli sinon.
 */
const CATEGORIES = [
  { cle: 'telephone', pluriel: 'telephones', label: 'Téléphones', icone: 'phone' },
  { cle: 'laptop', pluriel: 'laptops', label: 'Ordinateurs portables', icone: 'laptop' },
  { cle: 'cpu', pluriel: 'cpus', label: 'Processeurs', icone: 'cpu' },
  { cle: 'gpu', pluriel: 'gpus', label: 'Cartes graphiques', icone: 'gpu' },
];

const GROUPES = [
  {
    /*
     * Premier, et sans titre de rubrique : c'est la raison d'être du site.
     * Le classement sert à trouver un produit, la comparaison est ce qu'on
     * vient y faire — l'ordre du menu doit dire lequel des deux compte.
     *
     * Pas d'intitulé de groupe non plus : « COMPARER » au-dessus de
     * « Comparer deux produits » répéterait le même mot deux fois.
     */
    id: 'comparer',
    liens: [{
      to: '/compare',
      label: 'Comparer',
      marqueur: balance,
      principal: true,
    }],
  },
  {
    id: 'classements',
    titre: 'Classement',
    marqueur: ranking,
    liens: CATEGORIES.map(c => ({ to: `/${c.pluriel}`, label: c.label, icone: c.icone })),
  },
  {
    id: 'gestion',
    titre: 'Gestion',
    liens: [{ to: '/admin', label: 'Administration', icone: 'admin' }],
  },
];

/**
 * Tiroir de navigation.
 *
 * Recouvre le contenu à toutes les largeurs plutôt que de pousser la mise en
 * page : un tiroir qui déplace la colonne principale fait sauter la lecture à
 * chaque ouverture, et il fallait de toute façon un mode recouvrant sur
 * mobile — deux comportements à maintenir au lieu d'un.
 *
 * Le clavier est traité comme la souris : `Échap` ferme, le focus entre dans
 * le tiroir à l'ouverture et revient sur le bouton à la fermeture. Sans ce
 * retour, l'utilisateur au clavier se retrouve renvoyé en haut du document
 * après chaque fermeture.
 */
function Sidebar({ ouvert, onClose, boutonRef, theme, toggleTheme }) {
  const tiroirRef = useRef(null);
  const location = useLocation();

  // Toute navigation ferme le tiroir : le garder ouvert sur la page d'arrivée
  // masquerait justement ce qu'on vient de demander.
  useEffect(() => {
    if (ouvert) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!ouvert) return undefined;

    // Capturé maintenant : au moment du nettoyage, `boutonRef.current` peut
    // déjà pointer ailleurs, et le focus reviendrait sur le mauvais élément.
    const declencheur = boutonRef?.current;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    tiroirRef.current?.focus();

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      declencheur?.focus();
    };
  }, [ouvert, onClose, boutonRef]);

  return (
    <>
      <div
        className={`nr-scrim${ouvert ? ' is-visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <nav
        className={`nr-drawer${ouvert ? ' is-open' : ''}`}
        ref={tiroirRef}
        aria-label="Navigation principale"
        // Retiré de l'ordre de tabulation ET de la restitution vocale quand il
        // est fermé : un tiroir seulement masqué visuellement reste atteignable
        // au clavier, et le focus disparaît alors hors de l'écran.
        // Booléen, pas chaîne vide : React 19 attend une valeur booléenne ici
        // et ignore silencieusement `inert=""`.
        inert={!ouvert}
      >
        <div className="nr-drawer-head">
          <span className="nr-logo">Compare<em>Tech</em></span>
          <button className="nr-icon-btn" onClick={onClose} aria-label="Fermer le menu">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {GROUPES.map(groupe => (
          <div key={groupe.id} className="nr-drawer-group">
            {groupe.titre && <p className="nr-drawer-group-title">
              {groupe.marqueur && (
                <span
                  className="nr-mask-icon"
                  style={{ '--src': `url(${groupe.marqueur})`, width: 13, height: 13 }}
                  aria-hidden="true"
                />
              )}
              {groupe.titre}
            </p>}
            {groupe.liens.map(lien => (
              <NavLink
                key={lien.to}
                to={lien.to}
                className={({ isActive }) =>
                  `nr-drawer-link${lien.principal ? ' is-principal' : ''}` +
                  `${isActive && estCourant(lien.to, location) ? ' is-active' : ''}`
                }
              >
                {lien.marqueur ? (
                  <span
                    className="nr-mask-icon"
                    style={{ '--src': `url(${lien.marqueur})`, width: 16, height: 16 }}
                    aria-hidden="true"
                  />
                ) : (
                  <Icone nom={lien.icone} size={16} />
                )}
                <span>{lien.label}</span>
              </NavLink>
            ))}
          </div>
        ))}

        {toggleTheme && (
          <div className="nr-drawer-footer">
            <span className="nr-text-small" style={{ color: 'var(--nr-muted)' }}>
              Mode {theme === 'dark' ? 'sombre' : 'clair'}
            </span>
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>
        )}
      </nav>
    </>
  );
}

/*
 * `NavLink` ne compare que le chemin. Or les quatre entrées « Comparer »
 * partagent `/compare` et ne se distinguent que par leur paramètre `type` :
 * sans cette vérification, les quatre s'allumeraient ensemble.
 */
function estCourant(to, location) {
  const [chemin, requete] = to.split('?');
  if (chemin !== location.pathname) return false;
  if (!requete) return true;
  return new URLSearchParams(location.search).get('type') ===
    new URLSearchParams(requete).get('type');
}

export default Sidebar;
