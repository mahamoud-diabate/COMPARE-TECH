import { API_BASE } from '../api';
import React, { useState } from 'react';
import { ScoreBar } from './Score';
import { getProductScore } from '../utils/scores';
import { resolveType, toNumber, formatValue } from '../utils/specs';
import { indexMeneurs } from '../utils/marche';
import { SEGMENTS } from '../../../shared/criteres.js';

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
/*
 * `analyseSeule` : sur la page comparative, les notes et l'écart sont déjà
 * affichés en tête ; le bloc ne garde alors que l'analyse rédigée, pour ne
 * pas répéter les mêmes chiffres une troisième fois.
 */
function Verdict({ products, productType, analyseSeule = false }) {
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!products || products.length < 2) return null;

  const [p1] = products;
  const type = resolveType(productType || p1.productType);
  const metric = MAIN_METRIC[type] || MAIN_METRIC.cpu;

  const askGemini = async () => {
    setLoading(true);
    try {
      // Même point d'entrée que le reste du site : en développement, `/api`
      // passe par le proxy Vite. L'ancienne version visait en dur un backend
      // local sur le port 3001, qui n'existe que si on le démarre soi-même.
      // Le serveur relit les produits en base et calcule lui-même le verdict :
      // on ne lui envoie que la catégorie et les identifiants.
      const response = await fetch(`${API_BASE}/ai/verdict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: SEGMENTS[type],
          ids: products.map(p => p.slug || p._id),
        }),
      });
      const data = await response.json();
      setAiAnalysis(
        response.ok
          ? { verdict: data.verdict, texte: data.aiResponse, motif: data.motif }
          : { erreur: data.error || 'Une erreur est survenue sur le serveur IA.' }
      );
    } catch {
      setAiAnalysis({ erreur: "Impossible de joindre le serveur d'analyse." });
    }
    setLoading(false);
  };

  const scores = products.map(p => getProductScore(p, productType));
  const best = Math.max(...scores);
  // Zone d'égalité : une note à moins de 3 % de la meilleure est une égalité
  // de fait, comme dans l'en-tête de la comparaison.
  const winners = indexMeneurs(scores).map(i => products[i]);

  const rawValues = products.map(p => toNumber(p[metric.key]));
  const usable = rawValues.filter(v => v !== null && v > 0);
  const rawBest = usable.length ? Math.max(...usable) : null;
  const rawWorst = usable.length ? Math.min(...usable) : null;
  const rawDelta =
    usable.length > 1 && rawWorst > 0 && rawBest !== rawWorst
      ? Math.round(((rawBest - rawWorst) / rawWorst) * 100)
      : null;

  const analyse = (
    <div className="ct-card-body">
      {!aiAnalysis ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span className="ct-text-gray-small" style={{ flex: '1 1 240px' }}>
            Un commentaire rédigé peut compléter les chiffres. Le gagnant est calculé par le site ;
            le modèle de langage ne fait que le rédiger, et son texte est écarté s’il cite un
            chiffre absent des mesures.
          </span>
          <button className="ct-btn" onClick={askGemini} disabled={loading}>
            {loading ? 'Analyse en cours…' : 'Demander une analyse'}
          </button>
        </div>
      ) : (
        <>
          {aiAnalysis.erreur && <p>{aiAnalysis.erreur}</p>}
          {aiAnalysis.verdict && (
            <p>
              <strong>Verdict calculé :</strong> {aiAnalysis.verdict}
            </p>
          )}
          {aiAnalysis.texte && (
            <>
              <div className="ct-title-h4">Avis rédigé</div>
              <p style={{ whiteSpace: 'pre-line' }}>{aiAnalysis.texte}</p>
              <p className="ct-text-gray-small" style={{ marginTop: 8 }}>
                Texte produit automatiquement à partir des mesures ci-dessus ; ses chiffres ont été
                vérifiés.
              </p>
            </>
          )}
          {aiAnalysis.motif && <p className="ct-text-gray-small">{aiAnalysis.motif}</p>}
        </>
      )}
    </div>
  );

  if (analyseSeule) {
    return (
      <section className="ct-card">
        <div className="ct-card-head">
          <h2 className="ct-title-h2">Avis rédigé (optionnel)</h2>
        </div>
        {analyse}
      </section>
    );
  }

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
              <strong>{winners.map(p => p.name).join(' et ')}</strong> terminent à égalité sur le
              score global (moins de 3 % d’écart).
            </>
          ) : (
            <>
              <strong>{winners[0].name}</strong> l’emporte sur le score global.
            </>
          )}
          {rawDelta !== null && (
            <>
              {' '}
              Sur {metric.label}, l’écart est de {rawDelta} % ({formatValue(rawBest)} contre{' '}
              {formatValue(rawWorst)}).
            </>
          )}
        </p>
      </div>

      <hr className="ct-card-sep" />

      {analyse}
    </section>
  );
}

export default Verdict;
