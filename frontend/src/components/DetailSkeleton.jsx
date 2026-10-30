import React from 'react';

const Line = ({ w = '100%', h = 14, mb = 8 }) => (
  <div className="ct-skeleton" style={{ width: w, height: h, marginBottom: mb }} />
);

/**
 * Silhouette de la fiche produit pendant le chargement.
 *
 * Reprend la même structure à deux étages que <ProductDetail /> :
 * - Hero avec vignette
 * - Étage 1 : carte d'usages et onglets
 * - Étage 2 : grille asymétrique (datasheet + volet sticky)
 */
function DetailSkeleton() {
  return (
    <div className="ct-main" aria-busy="true" aria-label="Chargement de la fiche">
      {/* Hero skeleton */}
      <section className="ct-card ct-fiche-hero">
        <div className="ct-skeleton" style={{ width: 140, height: 140, borderRadius: 4 }} />
        <div className="ct-fiche-meta">
          <Line w="20%" h={12} mb={6} />
          <Line w="60%" h={28} mb={8} />
          <Line w="40%" h={14} mb={0} />
        </div>
        <div className="ct-fiche-actions">
          <Line w={120} h={26} mb={8} />
          <Line w={160} h={32} mb={0} />
        </div>
      </section>

      {/* Étage 1 Usages skeleton */}
      <section className="ct-card" style={{ marginBottom: 20 }}>
        <div className="ct-fiche-usage-header">
          <Line w="35%" h={16} mb={4} />
          <Line w="15%" h={12} mb={0} />
        </div>
        <div className="ct-fiche-usage-wrap">
          <div style={{ display: 'flex', gap: 8 }}>
            <Line w={140} h={32} mb={0} />
            <Line w={160} h={32} mb={0} />
            <Line w={150} h={32} mb={0} />
          </div>
          <div className="ct-fiche-usage-detail-box">
            <div>
              <Line w="40%" h={12} mb={8} />
              <Line w="60%" h={32} mb={8} />
              <Line w="80%" h={14} mb={0} />
            </div>
            <div style={{ borderLeft: '2px solid var(--ct-line-strong)', paddingLeft: 22 }}>
              <Line w="30%" h={16} mb={10} />
              <Line w="95%" h={14} mb={6} />
              <Line w="75%" h={14} mb={0} />
            </div>
          </div>
        </div>
      </section>

      {/* Étage 2 Datasheet asymétrique skeleton */}
      <div className="ct-fiche-datasheet-layout">
        <div className="ct-fiche-spec-groups">
          {[0, 1, 2].map(g => (
            <section key={g} className="ct-fiche-spec-group">
              <div className="ct-fiche-spec-group-head">
                <Line w="25%" h={14} mb={0} />
              </div>
              <div style={{ padding: '12px 18px' }}>
                {[0, 1, 2, 3].map(r => (
                  <div key={r} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Line w="35%" h={14} mb={0} />
                    <Line w="20%" h={14} mb={0} />
                    <Line w="15%" h={12} mb={0} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="ct-fiche-sidebar-sticky">
          <div className="ct-fiche-side-card">
            <Line w="50%" h={14} mb={12} />
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Line w="40%" h={13} mb={0} />
                <Line w="25%" h={15} mb={0} />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default DetailSkeleton;
