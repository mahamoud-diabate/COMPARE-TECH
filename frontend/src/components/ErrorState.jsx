import React from 'react';

/**
 * Affiché quand un chargement échoue.
 *
 * Auparavant, un échec réseau ne produisait qu'un `console.error` : la page
 * restait vide, sans distinction entre « aucun résultat » et « le serveur est
 * injoignable ». Un visiteur ne pouvait pas savoir qu'il suffisait de réessayer.
 */
function ErrorState({ message, onRetry }) {
  return (
    <div className="nr-card">
      <div className="nr-empty">
        <p style={{ color: 'var(--nr-text)', fontWeight: 600, marginBottom: 4 }}>
          Données indisponibles
        </p>

        <p style={{ maxWidth: 460, margin: '0 auto 4px' }}>
          {message || "Le serveur n'a pas pu être joint."}
        </p>

        <p className="nr-text-gray-small" style={{ maxWidth: 460, margin: '0 auto 16px' }}>
          L’API est hébergée sur une offre gratuite qui met le serveur en veille :
          un nouvel essai suffit généralement.
        </p>

        {onRetry && (
          <button className="nr-btn" onClick={onRetry}>Réessayer</button>
        )}
      </div>
    </div>
  );
}

export default ErrorState;
