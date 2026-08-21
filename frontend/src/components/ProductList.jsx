import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ImageOff } from 'lucide-react';
import { ScoreBox } from './Score';
import { getProductScore } from '../utils/scores';
import { formatValue } from '../utils/specs';
import { cheminProduit } from '../utils/liens';

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
  // Trier par score une liste où personne n'est noté ne trie rien : l'ordre
  // affiché serait celui de la base, sans que rien ne l'annonce. On classe
  // alors par nom, ce qui est au moins un ordre lisible.
  const aucuneNote = cpus.every(p => getProductScore(p, productType) <= 0);
  const [sortOption, setSortOption] = useState(aucuneNote ? 'name-asc' : 'score-desc');
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
    <section className="ct-card">
      <div className="ct-toolbar">
        <div>
          <h1 className="ct-title-h2" style={{ display: 'inline' }}>{TITLES[key]}</h1>
          <span className="ct-text-gray-small" style={{ marginLeft: 8 }}>
            {sorted.length} modèle{sorted.length > 1 ? 's' : ''}
          </span>
        </div>
        <select
          className="ct-select"
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
        <p className="ct-empty">Aucun produit ne correspond aux filtres.</p>
      ) : (
        <>
          <div className="ct-rank-head">
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
              compareType &&
              compareList.length > 0 &&
              productType !== compareType;
            const score = getProductScore(product, productType);

            return (
              <div
                key={product._id}
                className={`ct-rank-row${isDisabled ? ' is-disabled' : ''}`}
              >
                <span className="ct-rank-num">{index + 1}</span>

                {product.imageUrl && !failedImages[product._id] ? (
                  <img
                    className="ct-rank-thumb"
                    src={product.imageUrl}
                    alt=""
                    loading="lazy"
                    onError={() =>
                      setFailedImages(prev => ({ ...prev, [product._id]: true }))
                    }
                  />
                ) : (
                  <span className="ct-rank-thumb-empty">
                    <ImageOff size={18} strokeWidth={1.5} aria-label="Image indisponible" />
                  </span>
                )}

                <div style={{ minWidth: 0 }}>
                  <div className="ct-rank-name">
                    <Link to={cheminProduit(key, product)}>{product.name}</Link>
                  </div>
                  <div className="ct-rank-sub">{product.brand}</div>
                </div>

                <div className="ct-rank-specs">{summarize(product, key)}</div>

                <div style={{ textAlign: 'center' }}>
                  <ScoreBox score={score} />
                </div>

                <div className="ct-rank-compare" style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    className={`ct-chip${isSelected ? ' is-on' : ''}`}
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
