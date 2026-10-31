import React from 'react';
import { explainScore } from '../../utils/scores';
import { SPEC_GROUPS, resolveType, formatValue, winnerIndex } from '../../utils/specs';
import { decrireSource } from '../../utils/marche';
import { Glyphe } from './Repere';

/**
 * Tiroir « fouiller les données » : le calcul exact de la note, toutes les
 * valeurs (y compris les caractéristiques non chiffrées) et, pour chacune, la
 * page d'où elle vient et sa date de relevé.
 *
 * Fermé par défaut : le visiteur pressé n'en a pas besoin, le curieux sait où
 * le trouver. C'est aussi là que le site cite ses sources, ce qu'il ne
 * faisait nulle part auparavant.
 */
function SourcesMarche({ produits, productType }) {
  const type = resolveType(productType);
  if (!type) return null;

  const lignes = SPEC_GROUPS[type].flatMap(groupe => groupe.rows);
  const formule = explainScore(produits[0], productType).formule;

  return (
    <section className="ct-card ct-marche-carte" id="sources">
      <details className="ct-marche-tiroir">
        <summary>
          <div>
            <h2 className="ct-title-h2">Sources, formule de la note et tableau complet</h2>
            <p className="ct-text-gray-small">
              Toutes les valeurs, le calcul de la note sur 100 et le lien vers chaque source.
            </p>
          </div>
          <span className="ct-marche-tiroir-bouton">Fouiller les données</span>
        </summary>

        <div className="ct-marche-tiroir-corps">
          {formule && (
            <div className="ct-marche-methode">
              <strong>Calcul de la note sur 100 :</strong>{' '}
              {formule.termes
                .map(
                  t => `${Math.round(t.poids * 100)} % ${t.label} (plafond ${formatValue(t.max)})`
                )
                .join(' + ')}
              . Une mesure manquante rend la note incalculable : elle ne compte jamais pour zéro.
            </div>
          )}

          <div className="ct-marche-tableau-defile">
            <table className="ct-marche-tableau">
              <thead>
                <tr>
                  <th scope="col">Caractéristique</th>
                  {produits.map((p, i) => (
                    <th scope="col" key={p._id}>
                      <Glyphe index={i} /> {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lignes.map(ligne => {
                  const gagnant = ligne.departage
                    ? winnerIndex(produits, ligne.key, ligne.invert)
                    : -1;
                  return (
                    <tr key={ligne.key}>
                      <th scope="row">{ligne.label}</th>
                      {produits.map((p, i) => {
                        const valeur = formatValue(p[ligne.key], ligne.unit);
                        const source = decrireSource(p.provenance?.[ligne.key]);
                        return (
                          <td key={p._id} className={i === gagnant ? 'is-win' : ''}>
                            <span className="ct-num">{valeur ?? '—'}</span>
                            {source && (
                              <a
                                className="ct-marche-source"
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={
                                  [
                                    source.extrait && `Extrait relevé : « ${source.extrait} »`,
                                    source.version && `Version du test : ${source.version}`,
                                    source.archive && `Copie archivée : ${source.archive}`,
                                  ]
                                    .filter(Boolean)
                                    .join('\n') || undefined
                                }
                              >
                                {source.site}
                                {source.date ? `, relevé le ${source.date}` : ''}
                                {source.protocole ? ` · ${source.protocole}` : ''}
                                {source.origine ? ` · ${source.origine}` : ''}
                              </a>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </details>
    </section>
  );
}

export default SourcesMarche;
