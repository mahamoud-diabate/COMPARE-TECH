import React from 'react';
import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';

/**
 * Écran de repli quand un composant lève une exception pendant le rendu.
 *
 * Sans lui, React démonte tout l'arbre et l'utilisateur reçoit une page
 * blanche, sans message ni moyen de repartir — l'un des symptômes les plus
 * francs d'une interface jamais mise à l'épreuve.
 *
 * Le détail technique n'est montré qu'en développement : en production il
 * n'aide pas le visiteur et peut révéler la structure interne. Il part en
 * revanche toujours dans la console, pour rester exploitable.
 *
 * Limite connue, propre à React : une exception levée dans un gestionnaire
 * d'événement (un `onClick`) ne remonte pas jusqu'ici. Ces cas-là se traitent
 * sur place, avec un `try/catch` et un message — c'est ce que font déjà les
 * appels réseau du site.
 */
function RouteError() {
  const error = useRouteError();
  console.error('Erreur de rendu :', error);

  const message = isRouteErrorResponse(error)
    ? `${error.status} — ${error.statusText}`
    : error?.message || 'Erreur inattendue.';

  return (
    <div className="ct-main">
      <section className="ct-card">
        <div className="ct-empty">
          <p style={{ color: 'var(--ct-text)', fontWeight: 600, marginBottom: 4 }}>
            Cette page n’a pas pu s’afficher
          </p>
          <p style={{ maxWidth: 460, margin: '0 auto 16px' }}>
            Le défaut vient du site, pas de vous. Revenir à l’accueil ou recharger
            la page suffit généralement.
          </p>

          {import.meta.env.DEV && (
            <pre
              style={{
                textAlign: 'left',
                maxWidth: 560,
                margin: '0 auto 16px',
                padding: 12,
                background: 'var(--ct-card-alt)',
                border: '1px solid var(--ct-line)',
                borderRadius: 3,
                fontSize: 12,
                whiteSpace: 'pre-wrap',
                overflowX: 'auto',
              }}
            >
              {message}
            </pre>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link className="ct-btn" to="/">Accueil</Link>
            <button className="ct-btn ct-btn-ghost" onClick={() => window.location.reload()}>
              Recharger
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default RouteError;
