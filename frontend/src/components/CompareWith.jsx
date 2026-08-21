import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ScoreBox } from './Score';
import { getProductScore } from '../utils/scores';

/**
 * « Comparer avec… » — l'entrée directe vers un face-à-face depuis la fiche.
 *
 * Deux chemins volontairement distincts :
 *  - les rivaux proposés, choisis par proximité de score. Comparer un modèle
 *    à celui qui le suit de près est la question qu'on se pose vraiment ;
 *    l'opposer au meilleur de la catégorie ne dit rien d'utile.
 *  - le sélecteur, pour aller chercher n'importe quel autre modèle.
 */
function CompareWith({ product, type, others = [] }) {
  const [choice, setChoice] = useState('');
  const navigate = useNavigate();

  if (!product || others.length === 0) return null;

  const score = getProductScore(product, type);

  const rivals = [...others]
    .map(other => ({ other, score: getProductScore(other, type) }))
    .sort((a, b) => Math.abs(a.score - score) - Math.abs(b.score - score))
    .slice(0, 3);

  const compareUrl = (otherId) => `/compare?type=${type}&ids=${product._id},${otherId}`;

  const submit = (e) => {
    e.preventDefault();
    if (choice) navigate(compareUrl(choice));
  };

  return (
    <section className="ct-card">
      <div className="ct-card-head">
        <h2 className="ct-title-h2">Comparer avec</h2>
        <p className="ct-text-gray-small">
          Face-à-face détaillé : différences clés, notes par critère et tableau complet.
        </p>
      </div>

      <div className="ct-card-body" style={{ paddingTop: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {rivals.map(({ other, score: rivalScore }) => (
            <Link key={other._id} className="ct-versus" to={compareUrl(other._id)}>
              <span className="ct-versus-vs">vs</span>
              <span className="ct-versus-name">{other.name}</span>
              <ScoreBox score={rivalScore} />
            </Link>
          ))}
        </div>

        <form onSubmit={submit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <label className="ct-label" htmlFor="compare-with" style={{ flex: '1 1 100%' }}>
            Ou choisir un autre modèle
          </label>
          <select
            id="compare-with"
            className="ct-select"
            style={{ flex: '1 1 240px' }}
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
          >
            <option value="">Sélectionner un modèle…</option>
            {others.map(other => (
              <option key={other._id} value={other._id}>{other.name}</option>
            ))}
          </select>
          <button className="ct-btn" type="submit" disabled={!choice}>
            Comparer
          </button>
        </form>
      </div>
    </section>
  );
}

export default CompareWith;
