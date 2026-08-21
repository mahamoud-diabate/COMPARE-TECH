import React from 'react';

function LoadingSpinner({ message = 'Chargement des données…', coldStart = false }) {
  return (
    <div className="ct-card">
      <div className="ct-empty">
        <div className="ct-spinner" role="status" aria-label="Chargement" />
        <p style={{ marginTop: 10, marginBottom: 0 }}>{message}</p>

        {/* L'API dort sur le palier gratuit de Render : le premier appel réveille
            l'instance et peut prendre une trentaine de secondes. On l'annonce
            plutôt que de laisser croire à une panne. */}
        {coldStart && (
          <p className="ct-text-gray-small" style={{ maxWidth: 460, margin: '10px auto 0' }}>
            Le serveur était en veille et redémarre — comptez une trentaine de
            secondes au premier chargement. Les suivants sont immédiats.
          </p>
        )}
      </div>
    </div>
  );
}

export default LoadingSpinner;
