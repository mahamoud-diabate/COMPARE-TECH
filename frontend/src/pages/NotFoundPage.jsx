import React from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';

function NotFoundPage() {
  usePageTitle('Page introuvable');

  return (
    <div className="ct-main">
      <section className="ct-card">
        <div className="ct-empty">
          <p className="ct-title-h1" style={{ marginBottom: 4 }}>404</p>
          <p style={{ color: 'var(--ct-text)', fontWeight: 600, marginBottom: 4 }}>
            Page introuvable
          </p>
          <p style={{ maxWidth: 420, margin: '0 auto 16px' }}>
            L’adresse demandée n’existe pas, ou la fiche a été retirée.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link className="ct-btn" to="/">Accueil</Link>
            <Link className="ct-btn ct-btn-ghost" to="/cpus">Voir les processeurs</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default NotFoundPage;
