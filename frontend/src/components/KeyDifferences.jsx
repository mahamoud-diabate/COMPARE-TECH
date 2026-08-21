import React from 'react';
import { buildKeyDifferences, buildStrengths } from '../utils/specs';

/**
 * Synthèse « pourquoi choisir l'un plutôt que l'autre ».
 *
 * Entièrement calculée depuis les specs : aucune phrase n'est écrite à la
 * main, donc rien ne peut contredire le tableau détaillé plus bas. Les écarts
 * de moins de 3 % sont écartés — en dessous, la différence ne se ressent pas.
 *
 * Deux lectures selon le nombre de produits :
 *  - à deux, l'opposition terme à terme, la plus parlante ;
 *  - à trois ou plus, elle n'a plus de sens (A devance B sur un critère mais
 *    pas C). On répond alors à la seule question qui reste bien posée : sur
 *    quels critères chacun devance-t-il tous les autres ?
 *
 * La version précédente ne traitait que les deux premiers produits et
 * laissait tomber le troisième sans le dire, alors que la sélection en
 * autorise trois.
 */
function KeyDifferences({ products = [], productType }) {
  const list = products.filter(Boolean);
  if (list.length < 2) return null;

  const isPair = list.length === 2;

  const columns = isPair
    ? (() => {
        const diff = buildKeyDifferences(list[0], list[1], productType);
        return [diff.a, diff.b];
      })()
    : buildStrengths(list, productType);

  if (columns.every(lines => lines.length === 0)) return null;

  return (
    <section className="ct-card" id="differences">
      <div className="ct-card-head">
        <h2 className="ct-title-h2">Différences clés</h2>
        <p className="ct-text-gray-small" style={{ marginBottom: 12 }}>
          {isPair
            ? 'Les écarts mesurables entre les deux produits, du plus structurant au plus secondaire.'
            : 'Pour chaque produit, les critères où il devance tous les autres — et de combien par rapport au plus proche.'}
        </p>
      </div>

      <div className="ct-card-body" style={{ paddingTop: 0 }}>
        <div className={isPair ? 'ct-two-col' : 'ct-three-col'}>
          {list.map((product, index) => (
            <div key={product._id || index} style={{ marginBottom: 12 }}>
              <div className="ct-title-h4">
                {isPair ? `Pourquoi choisir ${product.name}` : product.name}
              </div>

              {columns[index]?.length > 0 ? (
                <ul className="ct-proscons is-plus">
                  {columns[index].map((reason, i) => <li key={i}>{reason}</li>)}
                </ul>
              ) : (
                <p className="ct-text-gray-small">
                  {isPair
                    ? 'Aucun avantage chiffré sur les critères suivis.'
                    : 'En tête sur aucun des critères suivis.'}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default KeyDifferences;
