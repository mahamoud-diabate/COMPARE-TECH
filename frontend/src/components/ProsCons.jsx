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
    <section className="ct-card">
      <div className="ct-card-head">
        <h2 className="ct-title-h2">{title}</h2>
      </div>
      <div className="ct-card-body">
        <div className="ct-two-col">
          <div>
            <div className="ct-title-h4">Avantages</div>
            {pros.length > 0 ? (
              <ul className="ct-proscons is-plus">
                {pros.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            ) : (
              <p className="ct-text-gray-small">Non renseignés.</p>
            )}
          </div>
          <div>
            <div className="ct-title-h4">Inconvénients</div>
            {cons.length > 0 ? (
              <ul className="ct-proscons is-minus">
                {cons.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            ) : (
              <p className="ct-text-gray-small">Non renseignés.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProsCons;
