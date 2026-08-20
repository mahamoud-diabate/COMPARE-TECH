import React, { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Cpu, MonitorPlay, Laptop, Smartphone, BarChart3, Lock, X } from 'lucide-react';

/*
 * Deux groupes, parce que le site fait deux choses distinctes que la barre
 * horizontale précédente présentait à l'identique :
 *  - comparer deux modèles précis (page de sélection puis face-à-face) ;
 *  - parcourir un classement complet.
 * « CPU » ne menait qu'au second ; on ne pouvait pas deviner que le premier
 * existait.
 */
const GROUPES = [
  {
    titre: 'Comparer',
    liens: [
      { to: '/compare?type=cpu', label: 'Processeurs', icone: Cpu },
      { to: '/compare?type=gpu', label: 'Cartes graphiques', icone: MonitorPlay },
      { to: '/compare?type=laptop', label: 'Ordinateurs portables', icone: Laptop },
      { to: '/compare?type=telephone', label: 'Téléphones', icone: Smartphone },
    ],
  },
  {
    titre: 'Classements',
    liens: [
      { to: '/cpus', label: 'Processeurs', icone: BarChart3 },
      { to: '/gpus', label: 'Cartes graphiques', icone: BarChart3 },
      { to: '/laptops', label: 'Ordinateurs portables', icone: BarChart3 },
      { to: '/telephones', label: 'Téléphones', icone: BarChart3 },
    ],
  },
  {
    titre: 'Gestion',
    liens: [{ to: '/admin', label: 'Administration', icone: Lock }],
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
function Sidebar({ ouvert, onClose, boutonRef }) {
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
    document.addEventListener('keydown', onKeyDown);

    tiroirRef.current?.querySelector('a, button')?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      declencheur?.focus();
    };
  }, [ouvert, onClose, boutonRef]);

  return (
    <>
      <div
        className={`nr-scrim${ouvert ? ' is-open' : ''}`}
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
          <div key={groupe.titre} className="nr-drawer-group">
            <p className="nr-drawer-group-title">{groupe.titre}</p>
            {groupe.liens.map(lien => (
              <NavLink
                key={lien.to}
                to={lien.to}
                className={({ isActive }) =>
                  `nr-drawer-link${isActive && estCourant(lien.to, location) ? ' is-active' : ''}`
                }
              >
                {React.createElement(lien.icone, { size: 16, strokeWidth: 2 })}
                <span>{lien.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
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
