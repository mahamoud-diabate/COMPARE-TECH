import React from 'react';

/**
 * Affiché quand un chargement échoue.
 *
 * Auparavant, un échec réseau ne produisait qu'un `console.error` : la page
 * restait vide, sans distinction entre « aucun résultat » et « le serveur est
 * injoignable ». Un visiteur ne pouvait pas savoir qu'il suffisait de réessayer.
 *
 * Mais tous les échecs ne se réessaient pas. Le message d'attente — « l'API
 * dort, un nouvel essai suffit » — s'affichait aussi sur une erreur 400, où il
 * est faux : la requête est refusée par le serveur, elle le sera autant de fois
 * qu'on la répète. Proposer un bouton qui ne peut pas marcher est pire que ne
 * rien proposer.
 *
 * D'où le tri par statut :
 *   pas de statut (panne réseau) ou 5xx → transitoire, on invite à réessayer ;
 *   4xx                                → définitif, on l'explique et on se tait.
 */
function ErrorState({ message, onRetry, statut }) {
  const transitoire = statut == null || statut >= 500;

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
          {transitoire
            ? 'L’API est hébergée sur une offre gratuite qui met le serveur en veille : un nouvel essai suffit généralement.'
            : 'Le serveur a refusé cette requête : réessayer ne changera rien. Vérifiez l’adresse, ou revenez au classement de la catégorie.'}
        </p>

        {onRetry && transitoire && (
          <button className="nr-btn" onClick={onRetry}>Réessayer</button>
        )}
      </div>
    </div>
  );
}

export default ErrorState;
