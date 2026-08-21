import { API_BASE } from '../api';
import React, { useState } from 'react';
import { ScoreBar } from './Score';
import { getProductScore } from '../utils/scores';
import { resolveType, toNumber, formatValue } from '../utils/specs';

// Métrique de référence par type : celle qui pèse le plus dans le score.
const MAIN_METRIC = {
  cpu: { key: 'geekbench_multi', label: 'Geekbench 6 multi-cœur' },
  gpu: { key: 'benchmark_3dmark', label: '3DMark' },
  laptop: { key: 'geekbench_multi', label: 'Geekbench 6 multi-cœur' },
  telephone: { key: 'geekbench_multi', label: 'Geekbench 6 multi-cœur' },
};

/**
 * Verdict : d'abord le calcul, ensuite — à la demande — l'avis rédigé par
 * l'IA. L'ordre compte : le chiffre est vérifiable, le commentaire ne l'est
 * pas, donc le chiffre passe en premier et l'IA reste explicitement une
 * option que le lecteur déclenche.
 */
function Verdict({ products, productType }) {
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!products || products.length < 2) return null;

  const [p1, p2] = products;
  const type = resolveType(productType || p1.productType);
  const metric = MAIN_METRIC[type] || MAIN_METRIC.cpu;

  const askGemini = async () => {
    setLoading(true);
    try {
      // Même point d'entrée que le reste du site : en développement, `/api`
      // passe par le proxy Vite. L'ancienne version visait en dur un backend
      // local sur le port 3001, qui n'existe que si on le démarre soi-même.
      const response = await fetch(`${API_BASE}/ai/verdict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product1: p1, product2: p2 }),
      });
      const data = await response.json();
      setAiAnalysis(
        response.ok && data.aiResponse
          ? data.aiResponse
          : data.error || data.details || 'Une erreur est survenue sur le serveur IA.'
      );
    } catch {
      setAiAnalysis("Impossible de joindre le serveur d'analyse.");
    }
    setLoading(false);
  };

  const scores = products.map(p => getProductScore(p, productType));
  const best = Math.max(...scores);
  const winners = products.filter((_, i) => scores[i] === best);

  const rawValues = products.map(p => toNumber(p[metric.key]));
  const usable = rawValues.filter(v => v !== null && v > 0);
  const rawBest = usable.length ? Math.max(...usable) : null;
  const rawWorst = usable.length ? Math.min(...usable) : null;
  const rawDelta =
    usable.length > 1 && rawWorst > 0 && rawBest !== rawWorst
      ? Math.round(((rawBest - rawWorst) / rawWorst) * 100)
      : null;

  return (
    <section className="ct-card">
      <div className="ct-card-head">
        <h2 className="ct-title-h2">Verdict</h2>
        <p className="ct-text-gray-small">
          Classement par score global, synthèse des benchmarks disponibles.
        </p>
      </div>

      <div className="ct-card-body">
        {products.map((product, i) => (
          <ScoreBar
            key={product._id}
            name={product.name}
            value={scores[i] > 0 ? scores[i] : 'n/d'}
            unit={scores[i] > 0 ? '/100' : null}
            percent={scores[i]}
            muted={scores[i] <= 0}
          />
        ))}

        <p style={{ marginTop: 4 }}>
          {best <= 0 ? (
            'Aucun benchmark exploitable pour départager ces produits.'
          ) : winners.length > 1 ? (
            <>
              <strong>{winners.map(p => p.name).join(' et ')}</strong> terminent à égalité
              sur le score global.
            </>
          ) : (
            <>
              <strong>{winners[0].name}</strong> l’emporte sur le score global.
            </>
          )}
          {rawDelta !== null && (
            <> Sur {metric.label}, l’écart est de {rawDelta} % ({formatValue(rawBest)} contre {formatValue(rawWorst)}).</>
          )}
        </p>
      </div>

      <hr className="ct-card-sep" />

      <div className="ct-card-body">
        {!aiAnalysis ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className="ct-text-gray-small" style={{ flex: '1 1 240px' }}>
              Un commentaire rédigé peut compléter les chiffres. Il est généré par un
              modèle de langage et n’est pas une mesure.
            </span>
            <button className="ct-btn" onClick={askGemini} disabled={loading}>
              {loading ? 'Analyse en cours…' : 'Demander une analyse'}
            </button>
          </div>
        ) : (
          <>
            <div className="ct-title-h4">Analyse générée</div>
            <p style={{ whiteSpace: 'pre-line' }}>{aiAnalysis}</p>
            <p className="ct-text-gray-small" style={{ marginTop: 8 }}>
              Texte produit automatiquement : à recouper avec le tableau de spécifications.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

export default Verdict;
