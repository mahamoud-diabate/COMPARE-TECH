import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ImageOff } from 'lucide-react';
import { ScoreBox } from './Score';
import { getProductScore } from '../utils/scores';
import { formatValue } from '../utils/specs';

const TITLES = {
  cpu: 'Processeurs',
  gpu: 'Cartes graphiques',
  laptop: 'Ordinateurs portables',
  telephone: 'Téléphones',
};

const resolveKey = (productType) => {
  const type = String(productType || '');
  return Object.keys(TITLES).find(key => type.includes(key)) || 'cpu';
};

/** Résumé d'une ligne : les deux ou trois specs qui distinguent réellement
 *  les produits d'une même catégorie. Le reste est sur la fiche. */
const summarize = (product, key) => {
  const parts = [];
  if (key === 'cpu') {
    if (product.cores) parts.push(`${product.cores} cœurs`);
    if (product.threads) parts.push(`${product.threads} threads`);
    if (product.max_freq_ghz) parts.push(formatValue(product.max_freq_ghz, 'GHz'));
  } else if (key === 'gpu') {
    if (product.memory_gb) parts.push(formatValue(product.memory_gb, 'Go'));
    if (product.memory_type) parts.push(product.memory_type);
  } else if (key === 'laptop') {
    if (product.cpu_name) parts.push(product.cpu_name);
    if (product.ram_gb) parts.push(`${product.ram_gb} Go RAM`);
  } else if (key === 'telephone') {
    if (product.storage_gb) parts.push(formatValue(product.storage_gb, 'Go'));
    if (product.battery_mah) parts.push(formatValue(product.battery_mah, 'mAh'));
  }
  return parts.join(' · ');
};

/** Étiquettes d'usage. Volontairement rares : un badge sur chaque ligne ne
 *  distingue plus rien. */
const getTags = (product, key) => {
  const tags = [];
  if (key === 'cpu') {
    if (product.geekbench_single >= 2800) tags.push('Gaming');
    if (product.geekbench_multi >= 20000) tags.push('Station de travail');
  } else if (key === 'gpu') {
    if (product.benchmark_3dmark >= 25000) tags.push('4K');
    else if (product.benchmark_3dmark >= 15000) tags.push('1440p');
  } else if (key === 'laptop') {
    if (/RTX|RX /.test(product.gpu_name || '')) tags.push('Jeu');
    if (product.battery_life_hours >= 12) tags.push('Endurance');
  } else if (key === 'telephone') {
    if (product.antutu_score >= 1500000) tags.push('Haut de gamme');
    if (product.battery_mah >= 5000) tags.push('Endurance');
  }
  return tags;
};

/**
 * Liste classée d'une catégorie.
 *
 * Format tableau plutôt que grille de cartes : sur un comparateur, la
 * question est « lequel est devant » — une grille oblige à sauter d'une
 * vignette à l'autre pour retrouver les notes, une liste triée y répond
 * en une lecture verticale.
 */
function ProductList({
  cpus = [],
  compareList = [],
  onCompareToggle = () => {},
  productType = 'cpu',
  compareType,
}) {
  const [sortOption, setSortOption] = useState('score-desc');
  const [failedImages, setFailedImages] = useState({});

  const key = resolveKey(productType);

  const sorted = [...cpus].sort((a, b) => {
    if (sortOption === 'name-asc') return a.name.localeCompare(b.name);
    if (sortOption === 'name-desc') return b.name.localeCompare(a.name);
    const sa = getProductScore(a, productType);
    const sb = getProductScore(b, productType);
    return sortOption === 'score-asc' ? sa - sb : sb - sa;
  });

  return (
    <section className="nr-card">
      <div className="nr-toolbar">
        <div>
          <h1 className="nr-title-h2" style={{ display: 'inline' }}>{TITLES[key]}</h1>
          <span className="nr-text-gray-small" style={{ marginLeft: 8 }}>
            {sorted.length} modèle{sorted.length > 1 ? 's' : ''}
          </span>
        </div>
        <select
          className="nr-select"
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          aria-label="Trier la liste"
        >
          <option value="score-desc">Score décroissant</option>
          <option value="score-asc">Score croissant</option>
          <option value="name-asc">Nom A → Z</option>
          <option value="name-desc">Nom Z → A</option>
        </select>
      </div>

      {sorted.length === 0 ? (
        <p className="nr-empty">Aucun produit ne correspond aux filtres.</p>
      ) : (
        <>
          <div className="nr-rank-head">
            <span>#</span>
            <span />
            <span>Modèle</span>
            <span>Caractéristiques</span>
            <span style={{ textAlign: 'center' }}>Score</span>
            <span style={{ textAlign: 'center' }}>Comparer</span>
          </div>

          {sorted.map((product, index) => {
            const isSelected = compareList.includes(product._id);
            const isDisabled =
              !isSelected &&
              compareType !== null &&
              compareType !== undefined &&
              productType !== compareType;
            const score = getProductScore(product, productType);
            const tags = getTags(product, key);

            return (
              <div
                key={product._id}
                className={`nr-rank-row${isDisabled ? ' is-disabled' : ''}`}
              >
                <span className="nr-rank-num">{index + 1}</span>

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
                    <ImageOff size={18} strokeWidth={1.5} aria-label="Image indisponible" />
                  </span>
                )}

                <div style={{ minWidth: 0 }}>
                  <div className="nr-rank-name">
                    <Link to={`/${key}/${product._id}`}>{product.name}</Link>
                    {tags.map(tag => (
                      <span key={tag} className="nr-badge" style={{ marginLeft: 6 }}>{tag}</span>
                    ))}
                  </div>
                  <div className="nr-rank-sub">{product.brand}</div>
                </div>

                <div className="nr-rank-specs">{summarize(product, key)}</div>

                <div style={{ textAlign: 'center' }}>
                  <ScoreBox score={score} />
                </div>

                <div className="nr-rank-compare" style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    className={`nr-chip${isSelected ? ' is-on' : ''}`}
                    onClick={() => onCompareToggle(product)}
                    disabled={isDisabled}
                  >
                    {isSelected ? 'Retirer' : 'Comparer'}
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}
    </section>
  );
}

export default ProductList;
