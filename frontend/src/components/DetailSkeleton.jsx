import React from 'react';

const Line = ({ w = '100%', h = 14, mb = 8 }) => (
  <div className="nr-skeleton" style={{ width: w, height: h, marginBottom: mb }} />
);

/**
 * Silhouette de la fiche produit pendant le chargement.
 * Reprend les mêmes blocs et les mêmes hauteurs que <ProductDetail /> : un
 * squelette d'une autre forme que le contenu final provoque un saut de mise
 * en page à l'arrivée des données.
 */
function DetailSkeleton() {
  return (
    <div className="nr-main" aria-busy="true" aria-label="Chargement de la fiche">
      <section className="nr-card">
        <div className="nr-card-head">
          <Line w="55%" h={26} />
          <Line w="18%" h={12} mb={4} />
        </div>
        <div className="nr-card-body">
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div className="nr-skeleton" style={{ width: 190, height: 180 }} />
            <div style={{ flex: '1 1 300px' }}>
              <Line w={130} h={28} mb={14} />
              <Line />
              <Line w="85%" />
              <Line w="60%" />
            </div>
          </div>
        </div>
      </section>

      <section className="nr-card">
        <div className="nr-card-body">
          <Line w="30%" h={18} mb={16} />
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ marginBottom: 16 }}>
              <Line w="45%" h={12} mb={6} />
              <Line h={4} mb={10} />
              <Line h={4} mb={0} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default DetailSkeleton;
