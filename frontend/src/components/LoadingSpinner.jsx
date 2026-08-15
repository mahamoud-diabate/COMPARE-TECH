import React from 'react';
import Spinner from 'react-bootstrap/Spinner';
import Container from 'react-bootstrap/Container';

function LoadingSpinner({ message = "Chargement des données...", coldStart = false }) {
  return (
    <Container className="d-flex flex-column align-items-center justify-content-center text-center" style={{ minHeight: '400px' }}>
      <Spinner animation="border" role="status" variant="primary" style={{ width: '3rem', height: '3rem' }}>
        <span className="visually-hidden">Loading...</span>
      </Spinner>
      <p className="mt-3 text-muted fw-bold mb-0">{message}</p>

      {/* L'API dort sur le palier gratuit de Render : le premier appel réveille
          l'instance et peut prendre une trentaine de secondes. On l'annonce
          plutôt que de laisser croire à une panne. */}
      {coldStart && (
        <p className="text-muted small mt-3 mb-0" style={{ maxWidth: '32rem' }}>
          ⏳ Le serveur était en veille et redémarre — cela prend une trentaine
          de secondes au premier chargement. Les suivants seront instantanés.
        </p>
      )}
    </Container>
  );
}

export default LoadingSpinner;