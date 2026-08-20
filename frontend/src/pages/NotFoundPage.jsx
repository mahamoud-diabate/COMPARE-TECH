import React from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';

function NotFoundPage() {
  usePageTitle('Page introuvable');

  return (
    <div className="nr-main">
      <section className="nr-card">
        <div className="nr-empty">
          <p className="nr-title-h1" style={{ marginBottom: 4 }}>404</p>
          <p style={{ color: 'var(--nr-text)', fontWeight: 600, marginBottom: 4 }}>
            Page introuvable
          </p>
          <p style={{ maxWidth: 420, margin: '0 auto 16px' }}>
            L’adresse demandée n’existe pas, ou la fiche a été retirée.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link className="nr-btn" to="/">Accueil</Link>
            <Link className="nr-btn nr-btn-ghost" to="/cpus">Voir les processeurs</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default NotFoundPage;
