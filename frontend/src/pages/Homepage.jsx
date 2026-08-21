import { API_BASE } from '../api';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ImageOff } from 'lucide-react';
import { Icone } from '../components/icons';
import AnimatedPage from '../components/AnimatedPage';
import { ScoreBox } from '../components/Score';
import { getProductScore } from '../utils/scores';
import { usePageTitle } from '../hooks/usePageTitle';
import { cheminProduit } from '../utils/liens';

/*
 * `key` nomme la collection de l'API (donc le compteur), `type` la catégorie
 * telle que l'attend la page de comparaison. Les deux diffèrent (« telephones »
 * contre « telephone ») : les garder côte à côte évite de recomposer l'un à
 * partir de l'autre à chaque usage.
 */
const CATEGORIES = [
  {
    key: 'telephones',
    type: 'telephone',
    title: 'Téléphones',
    desc: 'Geekbench 6, batterie, mémoire, diagonale',
    icon: 'phone',
  },
  {
    key: 'laptops',
    type: 'laptop',
    title: 'Ordinateurs portables',
    desc: 'Performances, luminosité, autonomie annoncée',
    icon: 'laptop',
  },
  {
    key: 'cpus',
    type: 'cpu',
    title: 'Processeurs',
    desc: 'Intel Core, AMD Ryzen — Geekbench 6, cœurs, fréquences',
    icon: 'cpu',
  },
  {
    key: 'gpus',
    type: 'gpu',
    title: 'Cartes graphiques',
    desc: 'GeForce RTX, Radeon — 3DMark, mémoire vidéo',
    icon: 'gpu',
  },
];

/**
 * Accueil : un point d'entrée, pas une plaquette.
 *
 * L'ancienne version empilait un grand titre en dégradé, des statistiques et
 * une liste d'arguments illustrée d'émojis, sans jamais montrer un produit.
 * Ici, le visiteur voit dès le premier écran les catégories, leur volume réel,
 * et les modèles les mieux notés — c'est ce qu'il est venu chercher.
 */
function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [counts, setCounts] = useState({ cpus: null, gpus: null, laptops: null, telephones: null });
  const [failedImages, setFailedImages] = useState({});

  usePageTitle(
    'Comparateur de matériel informatique',
    'Comparez processeurs, cartes graphiques, ordinateurs portables et téléphones à partir de benchmarks publics : Geekbench 6 et 3DMark.'
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [featuredRes, ...lists] = await Promise.all([
          fetch(`${API_BASE}/featured`).then(r => r.json()),
          ...CATEGORIES.map(c => fetch(`${API_BASE}/${c.key}`).then(r => r.json())),
        ]);
        if (cancelled) return;

        setFeatured(Array.isArray(featuredRes) ? featuredRes : []);
        setCounts(
          Object.fromEntries(
            CATEGORIES.map((c, i) => [c.key, Array.isArray(lists[i]) ? lists[i].length : 0])
          )
        );
      } catch {
        if (!cancelled) setCounts({ cpus: 0, gpus: 0, laptops: 0, telephones: 0 });
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const total = Object.values(counts).reduce((sum, n) => sum + (n || 0), 0);

  return (
    <AnimatedPage>
      <div className="nr-main-wide">
        <section className="nr-card">
          <div className="nr-card-head">
            <h1 className="nr-title-h1">Comparateur de matériel informatique</h1>
          </div>
          <div className="nr-card-body" style={{ paddingTop: 4 }}>
            <p className="nr-text-gray-small" style={{ maxWidth: 620 }}>
              Processeurs, cartes graphiques, ordinateurs portables et téléphones,
              notés sur une échelle commune à partir de benchmarks publics —
              Geekbench 6 et 3DMark. {total > 0 && `${total} modèles référencés.`}
            </p>
          </div>
        </section>

        <section className="nr-card">
          <div className="nr-card-head">
            <h2 className="nr-title-h2">Catégories</h2>
          </div>
          <div className="nr-card-body" style={{ paddingTop: 12 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12,
              }}
            >
              {CATEGORIES.map(category => (
                <Link
                  key={category.key}
                  to={`/compare?type=${category.type}`}
                  style={{
                    display: 'block',
                    padding: 12,
                    border: '1px solid var(--nr-line)',
                    borderRadius: 3,
                    color: 'inherit',
                    textDecoration: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--nr-accent-text)', display: 'flex' }}>
                      <Icone nom={category.icon} size={18} />
                    </span>
                    <span style={{ fontWeight: 600 }}>{category.title}</span>
                    <span className="nr-text-gray-small" style={{ marginLeft: 'auto' }}>
                      {counts[category.key] === null ? '…' : counts[category.key]}
                    </span>
                  </div>
                  <div className="nr-text-gray-small" style={{ marginTop: 4 }}>
                    {category.desc}
                  </div>
                  <div
                    className="nr-text-small"
                    style={{ marginTop: 6, color: 'var(--nr-accent-text)' }}
                  >
                    Comparer deux modèles →
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {featured.length > 0 && (
          <section className="nr-card">
            <div className="nr-card-head">
              <h2 className="nr-title-h2">Les mieux notés</h2>
              <p className="nr-text-gray-small">Meilleur score de chaque catégorie.</p>
            </div>
            <div className="nr-card-body" style={{ paddingTop: 8 }}>
              {featured.map(product => (
                <div key={product._id} className="nr-mini-row">
                  {product.imageUrl && !failedImages[product._id] ? (
                    <img
                      className="nr-rank-thumb"
                      src={product.imageUrl}
                      alt=""
                      loading="lazy"
                      onError={() =>
                        setFailedImages(prev => ({ ...prev, [product._id]: true }))
                      }
                    />
                  ) : (
                    <span className="nr-rank-thumb-empty">
                      <ImageOff size={16} strokeWidth={1.5} aria-label="Image indisponible" />
                    </span>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="nr-rank-name">
                      <Link to={cheminProduit(product.productType, product)}>{product.name}</Link>
                    </div>
                    <div className="nr-rank-sub">
                      {product.brand}
                      {product.highlight ? ` · ${product.highlight}` : ''}
                    </div>
                  </div>

                  <ScoreBox score={getProductScore(product, product.productType)} />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="nr-card">
          <div className="nr-card-head">
            <h2 className="nr-title-h2">Comment le score est calculé</h2>
          </div>
          <div className="nr-card-body" style={{ paddingTop: 8 }}>
            <div className="nr-two-col">
              <dl style={{ margin: 0 }}>
                <div className="nr-kv"><dt>Processeurs</dt><dd>Geekbench 6 · 70 % multi, 30 % mono</dd></div>
                <div className="nr-kv"><dt>Cartes graphiques</dt><dd>3DMark</dd></div>
              </dl>
              <dl style={{ margin: 0 }}>
                <div className="nr-kv"><dt>Ordinateurs portables</dt><dd>Geekbench 6 multi-cœur</dd></div>
                <div className="nr-kv"><dt>Téléphones</dt><dd>Geekbench 6 · 70 % multi, 30 % mono</dd></div>
              </dl>
            </div>
            <p className="nr-text-gray-small" style={{ marginTop: 12 }}>
              Chaque score est ramené sur 100 par rapport à un plafond de référence propre
              à la catégorie. Deux produits de catégories différentes ne sont donc pas
              comparables entre eux par leur score.
            </p>
          </div>
        </section>
      </div>
    </AnimatedPage>
  );
}

export default HomePage;
