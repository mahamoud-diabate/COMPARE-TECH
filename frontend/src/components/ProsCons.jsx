import React from 'react';

/**
 * Avantages / inconvénients rédigés, tels que stockés sur le produit.
 * Séparé des « différences clés » qui, elles, sont calculées : mélanger du
 * texte éditorial et des écarts mesurés dans un même bloc rendrait la source
 * de chaque affirmation illisible.
 */
function ProsCons({ product, title = 'Points forts et limites' }) {
  const pros = product?.pros?.filter(Boolean) || [];
  const cons = product?.cons?.filter(Boolean) || [];
  if (pros.length === 0 && cons.length === 0) return null;

  return (
    <section className="nr-card">
      <div className="nr-card-head">
        <h2 className="nr-title-h2">{title}</h2>
      </div>
      <div className="nr-card-body">
        <div className="nr-two-col">
          <div>
            <div className="nr-title-h4">Avantages</div>
            {pros.length > 0 ? (
              <ul className="nr-proscons is-plus">
                {pros.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            ) : (
              <p className="nr-text-gray-small">Non renseignés.</p>
            )}
          </div>
          <div>
            <div className="nr-title-h4">Inconvénients</div>
            {cons.length > 0 ? (
              <ul className="nr-proscons is-minus">
                {cons.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            ) : (
              <p className="nr-text-gray-small">Non renseignés.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProsCons;
