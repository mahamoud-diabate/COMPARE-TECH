import React from 'react';
import { ScoreBar } from './Score';
import { BENCHMARKS, resolveType, toNumber, formatValue } from '../utils/specs';

const shortName = (product) => {
  const name = product?.name || '';
  return name.length > 26 ? `${name.slice(0, 25)}…` : name;
};

/**
 * Barres de benchmark.
 *
 * Le filet est proportionnel au meilleur score du groupe comparé, pas à un
 * plafond théorique : c'est l'écart entre les produits qui doit se lire d'un
 * coup d'œil. Quand un seul produit est affiché, on retombe sur le plafond
 * de référence défini dans `utils/specs.js`, sinon la barre serait toujours
 * pleine et n'apprendrait rien.
 *
 * L'écart en pourcentage n'est affiché que sur le produit en tête.
 */
function BenchmarkBars({ products = [], productType, title = 'Benchmarks', subtitle }) {
  const list = products.filter(Boolean);
  const type = resolveType(productType || list[0]?.productType);
  if (!type || list.length === 0) return null;

  const groups = (BENCHMARKS[type] || [])
    .map(bench => {
      const values = list.map(p => toNumber(p[bench.key]));
      if (values.every(v => v === null || v <= 0)) return null;
      return { ...bench, values };
    })
    .filter(Boolean);

  if (groups.length === 0) return null;

  return (
    <section className="ct-card">
      <div className="ct-card-head">
        <h2 className="ct-title-h2">{title}</h2>
        {subtitle ? <p className="ct-text-gray-small" style={{ marginBottom: 12 }}>{subtitle}</p> : null}
      </div>
      <div className="ct-card-body" style={{ paddingTop: 0 }}>
        <div className="ct-two-col">
          {groups.map(bench => {
            const present = bench.values.filter(v => v !== null && v > 0);
            const best = Math.max(...present);
            const worst = Math.min(...present);
            const scale = list.length > 1 ? best : bench.max;
            const delta =
              present.length > 1 && worst > 0 && best !== worst
                ? Math.round(((best - worst) / worst) * 100)
                : null;

            return (
              <div key={bench.key} style={{ marginBottom: 18 }}>
                <div className="ct-title-h4">{bench.label}</div>
                {list.map((product, i) => {
                  const value = bench.values[i];
                  const isLeader = value !== null && value === best && present.length > 1;
                  return (
                    <ScoreBar
                      key={product._id || i}
                      name={shortName(product)}
                      value={value === null ? 'n/d' : formatValue(value)}
                      unit={value === null ? null : bench.unit}
                      percent={value === null ? 0 : (value / scale) * 100}
                      diff={isLeader ? delta : null}
                      muted={value === null}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default BenchmarkBars;
