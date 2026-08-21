import React from 'react';
import { explainScore, scoreGrade, rankInCategory, getProductScore } from '../utils/scores';
import { dataCompleteness, formatValue } from '../utils/specs';

const nombre = (valeur) => formatValue(valeur) ?? '—';

/**
 * Position du produit sur l'échelle des notes de sa catégorie.
 *
 * Une réglette de 0 à 100 : graduations tous les 25, un repère pour la
 * médiane du catalogue, un repère plein pour le produit. Le chiffre seul ne
 * dit pas s'il est bon — sa distance à la médiane, si.
 */
function Reglette({ note, rang }) {
  const { variable } = scoreGrade(note);

  return (
    <div className="ct-scale" aria-hidden="true">
      <div className="ct-scale-track">
        {[25, 50, 75].map(t => (
          <span key={t} className="ct-scale-tick" style={{ left: `${t}%` }} />
        ))}
        {rang && (
          <span
            className="ct-scale-median"
            style={{ left: `${rang.mediane}%` }}
            title={`Médiane de la catégorie : ${rang.mediane}`}
          />
        )}
        <span className="ct-scale-marker" style={{ left: `${note}%`, background: variable }} />
      </div>
      <div className="ct-scale-legend">
        <span>0</span>
        {rang && <span>médiane {rang.mediane}</span>}
        <span>100</span>
      </div>
    </div>
  );
}

/**
 * La note d'un produit, et tout ce qui permet de la vérifier.
 *
 * Trois choses qu'un comparateur affiche rarement, réunies parce qu'elles
 * répondent à la même question — « ce 88, je dois en penser quoi ? » :
 *  1. le rang et la médiane, qui donnent au chiffre son échelle ;
 *  2. le calcul terme à terme, replié mais accessible en un clic ;
 *  3. le nombre de caractéristiques réellement renseignées, trous nommés.
 *
 * Le calcul et le total sortent de la même table (`explainScore`) : le détail
 * affiché ne peut pas raconter autre chose que le chiffre qu'il explique.
 */
function ScorePanel({ product, type, peers = [] }) {
  if (!product) return null;

  const note = getProductScore(product, type);
  const { variable } = scoreGrade(note);
  const detail = explainScore(product, type);
  const rang = rankInCategory(product, peers, type);
  const completude = dataCompleteness(product, type);

  return (
    <section className="ct-card">
      <div className="ct-card-head">
        <h2 className="ct-title-h2">Note</h2>
      </div>

      <div className="ct-card-body" style={{ paddingTop: 8 }}>
        <div className="ct-score-head">
          <span className="ct-score-big" style={{ color: variable }}>
            {note > 0 ? note : '—'}
          </span>
          <span className="ct-score-head-side">
            <span className="ct-text-gray-small">sur 100</span>
            {rang && (
              <strong className="ct-score-rank">
                {rang.rang}<sup>{rang.rang === 1 ? 'er' : 'e'}</sup> sur {rang.total} notés
              </strong>
            )}
          </span>
        </div>

        {note > 0 && <Reglette note={note} rang={rang} />}

        {note === 0 && (
          <p className="ct-text-gray-small">
            Non mesurable : les benchmarks nécessaires au calcul ne sont pas renseignés
            pour ce modèle. Ce n’est pas une contre-performance, c’est une donnée absente.
          </p>
        )}

        {detail.termes.length > 0 && (
          <details className="ct-details">
            <summary>D’où vient cette note</summary>

            <table className="ct-formula">
              <tbody>
                {detail.termes.map(terme => (
                  <tr key={terme.key}>
                    <th scope="row">{terme.label}</th>
                    <td className="ct-num">
                      {terme.valeur === null ? 'non renseigné' : nombre(terme.valeur)}
                    </td>
                    <td className="ct-num ct-formula-scale">/ {nombre(terme.max)}</td>
                    <td className="ct-num ct-formula-scale">
                      {terme.poids < 1 ? `× ${Math.round(terme.poids * 100)} %` : ''}
                    </td>
                    <td className="ct-num ct-formula-points">
                      {terme.valeur === null ? '—' : Math.round(terme.points)}
                    </td>
                  </tr>
                ))}
                <tr className="ct-formula-total">
                  <th scope="row">Total</th>
                  <td colSpan="3" />
                  <td className="ct-num ct-formula-points">{note > 0 ? note : '—'}</td>
                </tr>
              </tbody>
            </table>

            <p className="ct-text-gray-small" style={{ marginTop: 10 }}>
              Chaque mesure est ramenée sur 100 par rapport à un plafond de référence
              propre à la catégorie, puis pondérée. Le plafond fixe l’échelle, il ne
              change pas l’ordre entre deux produits.
            </p>
          </details>
        )}

        {completude.total > 0 && (
          <p className="ct-coverage">
            <strong className="ct-num">{completude.remplies}</strong> caractéristiques
            renseignées sur {completude.total}
            {completude.manquantes.length > 0 && (
              <span className="ct-text-gray-small">
                {' '}— manque : {completude.manquantes.join(', ').toLowerCase()}
              </span>
            )}
          </p>
        )}
      </div>
    </section>
  );
}

export default ScorePanel;
