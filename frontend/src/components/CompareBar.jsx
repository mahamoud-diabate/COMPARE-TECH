import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Barre de sélection persistante.
 *
 * Elle reste visible tant qu'un produit est coché : c'est le seul rappel que
 * l'utilisateur a une comparaison en cours pendant qu'il fait défiler la
 * liste. Chaque étiquette est retirable individuellement — devoir tout vider
 * pour corriger une erreur de clic était le principal irritant.
 */
function CompareBar({ selectedItems, productType, onClear, onRemove }) {
  const navigate = useNavigate();
  const barRef = useRef(null);
  const ready = selectedItems.length >= 2;

  /*
   * Réserve en bas de page, à la hauteur réelle de la barre.
   *
   * Une valeur fixe ne pouvait pas convenir : la barre tient sur une ligne en
   * large, mais passe à trois lignes sur mobile ou avec trois produits
   * sélectionnés. La dernière ligne de la liste se retrouvait alors masquée.
   */
  useEffect(() => {
    const node = barRef.current;
    if (!node) return undefined;

    const apply = () => {
      document.body.style.setProperty('--ct-compare-bar-h', `${node.offsetHeight}px`);
    };
    apply();

    const observer = new ResizeObserver(apply);
    observer.observe(node);

    return () => {
      observer.disconnect();
      document.body.style.removeProperty('--ct-compare-bar-h');
    };
  }, []);

  const compare = () => {
    const ids = selectedItems.map(item => item._id).join(',');
    navigate(`/compare?type=${productType}&ids=${ids}`);
  };

  return (
    <div className="ct-compare-bar" ref={barRef}>
      <div className="ct-compare-bar-inner">
        <span className="ct-text-gray-small">Comparaison :</span>

        {selectedItems.map(item => (
          <span key={item._id} className="ct-compare-bar-tag">
            {item.name}
            {onRemove && (
              <button onClick={() => onRemove(item)} aria-label={`Retirer ${item.name}`}>
                ×
              </button>
            )}
          </span>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {!ready && (
            <span className="ct-text-gray-small">Sélectionnez au moins deux produits.</span>
          )}
          <button className="ct-btn ct-btn-ghost ct-btn-sm" onClick={onClear}>
            Tout effacer
          </button>
          <button className="ct-btn" onClick={compare} disabled={!ready}>
            Comparer ({selectedItems.length})
          </button>
        </div>
      </div>
    </div>
  );
}

export default CompareBar;
