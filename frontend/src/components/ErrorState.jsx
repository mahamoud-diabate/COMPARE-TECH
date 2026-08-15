import React from 'react';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';

/**
 * Affiché quand un chargement échoue.
 *
 * Auparavant, un échec réseau ne produisait qu'un `console.error` : la page
 * restait vide, sans distinction entre « aucun résultat » et « le serveur est
 * injoignable ». Un visiteur ne pouvait pas savoir qu'il suffisait de réessayer.
 */
function ErrorState({ message, onRetry }) {
  return (
    <Container
      className="d-flex flex-column align-items-center justify-content-center text-center"
      style={{ minHeight: '400px' }}
    >
      <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">📡</div>

      <h4 className="fw-bold mt-3 mb-2">Données indisponibles</h4>

      <p className="text-muted mb-1" style={{ maxWidth: '32rem' }}>
        {message || "Le serveur n'a pas pu être joint."}
      </p>
      <p className="text-muted small mb-4" style={{ maxWidth: '32rem' }}>
        L'API est hébergée sur une offre gratuite qui met le serveur en veille :
        un nouvel essai suffit généralement.
      </p>

      {onRetry && (
        <Button variant="primary" onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </Container>
  );
}

export default ErrorState;
