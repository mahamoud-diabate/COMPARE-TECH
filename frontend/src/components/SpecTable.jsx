import React from 'react';
import { SPEC_GROUPS, resolveType, formatValue, winnerIndex } from '../utils/specs';

/**
 * Tableau comparatif des spécifications.
 *
 * Un tableau par groupe, précédé de son titre, plutôt qu'un seul tableau avec
 * des lignes d'en-tête sur toute la largeur : le titre reprend ainsi la même
 * hiérarchie typographique que le reste de la page, et chaque groupe se lit
 * comme un bloc autonome.
 *
 * Il n'y a pas non plus d'en-tête de colonnes répété : les noms des produits
 * sont portés par la barre collante (`ct-sticky-names`), qui reste visible
 * pendant tout le défilement — alors qu'un `<thead>` disparaît au premier
 * écran et laisse le lecteur deviner à qui appartient chaque colonne.
 *
 * La cellule la plus favorable de chaque ligne chiffrée est surlignée ; à
 * égalité, personne ne l'est. Les lignes dont aucun produit ne porte la
 * donnée sont retirées, sinon le tableau se remplit de tirets.
 */
function SpecTable({ products = [], showDifferencesOnly = false, productType }) {
  const list = products.filter(Boolean);
  const type = resolveType(productType || list[0]?.productType);
  if (!type || list.length === 0) return null;

  const groups = SPEC_GROUPS[type] || [];

  const isIdentical = (key) => {
    const first = list[0]?.[key];
    return list.every(p => String(p?.[key] ?? '') === String(first ?? ''));
  };

  const hasAnyValue = (key) =>
    list.some(p => p?.[key] !== undefined && p?.[key] !== null && p?.[key] !== '');

  const visibleGroups = groups
    .map(group => ({
      ...group,
      rows: group.rows.filter(row => {
        if (!hasAnyValue(row.key)) return false;
        if (showDifferencesOnly && list.length > 1 && isIdentical(row.key)) return false;
        return true;
      }),
    }))
    .filter(group => group.rows.length > 0);

  if (visibleGroups.length === 0) {
    return <p className="ct-empty">Aucune différence sur les caractéristiques suivies.</p>;
  }

  return (
    <>
      {visibleGroups.map(group => (
        <section key={group.group}>
          <h3 className="ct-title-h3">{group.group}</h3>
          <div className="ct-table-wrap">
            <table className="ct-table">
              <caption className="ct-visually-hidden">
                {group.group} — {list.map(p => p.name).join(', ')}
              </caption>
              <tbody>
                {group.rows.map(row => {
                  const winner = row.numeric && list.length > 1
                    ? winnerIndex(list, row.key, row.invert)
                    : -1;
                  const equal = list.length > 1 && isIdentical(row.key);

                  return (
                    <tr key={row.key}>
                      <th scope="row" className={`cell-h${equal ? ' cell-equal' : ''}`}>
                        {row.label}
                      </th>
                      {list.map((product, i) => {
                        const text = formatValue(product[row.key], row.unit);
                        const classes = ['cell-v'];
                        if (i === winner) classes.push('cell-winner');
                        if (equal) classes.push('cell-equal');
                        return (
                          <td key={product._id} className={classes.join(' ')}>
                            {text ?? '—'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}

export default SpecTable;
