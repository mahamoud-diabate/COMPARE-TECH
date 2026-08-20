import React from 'react';
import { ScoreBar, ScoreSquare } from './Score';
import { buildCategoryScores } from '../utils/radarAxes';
import { getProductScore } from '../utils/scores';

const shortName = (product) => {
  const name = product?.name || '';
  return name.length > 26 ? `${name.slice(0, 25)}…` : name;
};

/**
 * Bloc « Évaluation » : une note sur 100 par critère, pour chaque produit.
 *
 * Les critères et leurs plafonds viennent de `utils/radarAxes.js`, donc les
 * chiffres affichés ici sont exactement ceux du radar. Un critère dont aucun
 * produit ne porte la donnée n'est pas affiché — mieux vaut une ligne en
 * moins qu'un zéro qui se lit comme une faiblesse.
 */
function CategoryScores({ products = [], productType }) {
  const list = products.filter(Boolean);
  if (list.length === 0) return null;

  const categories = buildCategoryScores(list, productType);
  const globals = list.map(p => getProductScore(p, productType));

  if (categories.length === 0) return null;

  const renderBlock = (label, hint, values, key) => {
    // Le carré plein revient à celui qui mène le critère ; à égalité, personne
    // ne le prend, faute de quoi le premier de la liste paraîtrait devant.
    const usable = values.filter(v => v !== null && v !== undefined);
    const best = usable.length > 0 ? Math.max(...usable) : null;
    const tied = usable.filter(v => v === best).length > 1;

    return (
      <div key={key} style={{ marginBottom: 18 }}>
        <div className="nr-title-h4" style={{ paddingBottom: 2 }}>{label}</div>
        {hint ? <div className="nr-text-gray-small" style={{ marginBottom: 8 }}>{hint}</div> : null}
        {list.map((product, i) => (
          <ScoreBar
            key={product._id || i}
            name={shortName(product)}
            value={<ScoreSquare value={values[i]} lead={!tied && values[i] === best && best > 0} />}
            percent={values[i] || 0}
            muted={values[i] === null || values[i] === undefined}
          />
        ))}
      </div>
    );
  };

  return (
    <section className="nr-card">
      <div className="nr-card-head">
        <h2 className="nr-title-h2">Évaluation</h2>
        <p className="nr-text-gray-small" style={{ marginBottom: 12 }}>
          Note sur 100 par critère, calculée depuis les caractéristiques mesurées.
        </p>
      </div>
      <div className="nr-card-body" style={{ paddingTop: 0 }}>
        <div className="nr-two-col">
          {categories.map((c, i) => renderBlock(c.label, c.hint, c.values, i))}
        </div>
        <hr className="nr-card-sep" style={{ margin: '4px 0 16px' }} />
        {renderBlock(
          'Score CompareTech',
          'Synthèse pondérée des benchmarks du produit',
          globals,
          'global'
        )}
      </div>
    </section>
  );
}

export default CategoryScores;
