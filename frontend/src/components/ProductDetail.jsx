import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ImageOff } from 'lucide-react';

import CategoryScores from './CategoryScores';
import BenchmarkBars from './BenchmarkBars';
import ProsCons from './ProsCons';
import SpecTable from './SpecTable';
import SimilarProducts from './SimilarProducts';
import CompareWith from './CompareWith';
import ScorePanel from './ScorePanel';
import { useCollection } from '../hooks/useCollection';
import { getProductScore } from '../utils/scores';
import { usePageTitle } from '../hooks/usePageTitle';

const META = {
  cpu: { label: 'Processeurs', path: '/cpus', collection: 'cpus' },
  gpu: { label: 'Cartes graphiques', path: '/gpus', collection: 'gpus' },
  laptop: { label: 'Ordinateurs portables', path: '/laptops', collection: 'laptops' },
  telephone: { label: 'Téléphones', path: '/telephones', collection: 'telephones' },
};

/**
 * Fiche produit, commune aux quatre catégories.
 *
 * Les quatre pages de détail dupliquaient auparavant la même mise en page à
 * quelques champs près, avec un « mode expert » qui masquait les benchmarks
 * derrière un interrupteur. Tout est désormais affiché, du plus synthétique
 * au plus détaillé : sur un comparateur, cacher les mesures derrière un
 * réglage revient à cacher l'essentiel.
 *
 * La catégorie entière est chargée une seule fois ici, puis partagée entre
 * « Comparer avec » et « Autres modèles ».
 */
function ProductDetail({ product, type }) {
  const meta = META[type] || META.cpu;
  const { data } = useCollection(meta.collection);

  // Classement décroissant, produit courant exclu. Mémoïsé : le tri porte sur
  // toute la collection et n'a aucune raison d'être refait à chaque rendu.
  const others = useMemo(() => {
    if (!product) return [];
    return data
      .filter(item => item._id !== product._id)
      .sort((a, b) => getProductScore(b, type) - getProductScore(a, type));
  }, [data, product, type]);

  usePageTitle(
    product && `${product.name} : fiche technique et score`,
    product && `Caractéristiques, benchmarks et note sur 100 du ${product.name} (${product.brand}).`
  );

  if (!product) return null;

  return (
    <div className="nr-main">
      <div className="nr-breadcrumb">
        <span><Link to="/">Accueil</Link></span>
        <span><Link to={meta.path}>{meta.label}</Link></span>
        <span>{product.name}</span>
      </div>

      <section className="nr-card">
        <div className="nr-card-head">
          <h1 className="nr-title-h1">{product.name}</h1>
          <p className="nr-text-gray-small">{product.brand}</p>
        </div>

        <div className="nr-card-body">
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ width: 190, flex: '0 0 auto' }}>
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  style={{
                    width: '100%',
                    height: 180,
                    objectFit: 'contain',
                    background: 'var(--nr-media)',
                    borderRadius: 3,
                    padding: 8,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: 180,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--nr-media)',
                    borderRadius: 3,
                  }}
                >
                  <ImageOff size={32} strokeWidth={1.5} color="#9aa0a6" />
                </div>
              )}
            </div>

            <div style={{ flex: '1 1 300px', minWidth: 0 }}>
              <p className="nr-text-gray-small" style={{ marginBottom: 12 }}>
                {product.brand} · {meta.label.toLowerCase()}. La note, son calcul et la
                position de ce modèle dans le classement figurent juste en dessous.
              </p>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link className="nr-btn nr-btn-ghost" to={meta.path}>
                  Voir tous les {meta.label.toLowerCase()}
                </Link>
                {product.buyUrl && (
                  <a className="nr-btn" href={product.buyUrl} target="_blank" rel="noreferrer">
                    Voir l’offre
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <ScorePanel product={product} type={type} peers={data} />

      <CompareWith product={product} type={type} others={others} />

      <CategoryScores products={[product]} productType={type} />

      <BenchmarkBars
        products={[product]}
        productType={type}
        subtitle="Le filet est relatif au plafond de référence de la catégorie."
      />

      <ProsCons product={product} />

      <section className="nr-card">
        <div className="nr-card-head">
          <h2 className="nr-title-h2">Fiche technique</h2>
          <p className="nr-text-gray-small" style={{ marginBottom: 12 }}>
            Caractéristiques telles qu’enregistrées en base.
          </p>
        </div>
        <SpecTable products={[product]} productType={type} />
      </section>

      {others.length > 0 && (
        <section className="nr-card">
          <div className="nr-card-head">
            <h2 className="nr-title-h2">Autres modèles</h2>
          </div>
          <div className="nr-card-body" style={{ paddingTop: 8 }}>
            <SimilarProducts products={others.slice(0, 4)} type={type} />
          </div>
        </section>
      )}
    </div>
  );
}

export default ProductDetail;
