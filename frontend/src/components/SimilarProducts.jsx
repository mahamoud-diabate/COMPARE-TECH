import React from 'react';
import { Link } from 'react-router-dom';
import { ImageOff } from 'lucide-react';
import { ScoreBox } from './Score';
import { getProductScore } from '../utils/scores';
import { cheminProduit } from '../utils/liens';

/**
 * Autres modèles de la même catégorie.
 *
 * Ne charge plus rien lui-même : la liste lui est fournie par la fiche
 * produit, qui la récupérait déjà pour alimenter le bloc « Comparer avec ».
 * Deux composants qui interrogeaient le même endpoint sur la même page
 * doublaient la requête pour un résultat identique.
 *
 * Rendu sans titre propre : il est toujours posé dans une carte qui porte
 * déjà son intitulé.
 */
function SimilarProducts({ products = [], type }) {
  if (products.length === 0) return null;

  return (
    <div>
      {products.map(product => (
        <div key={product._id} className="nr-mini-row">
          {product.imageUrl ? (
            <img className="nr-rank-thumb" src={product.imageUrl} alt="" loading="lazy" />
          ) : (
            <span className="nr-rank-thumb-empty">
              <ImageOff size={16} strokeWidth={1.5} aria-label="Image indisponible" />
            </span>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="nr-rank-name">
              <Link to={cheminProduit(type, product)}>{product.name}</Link>
            </div>
            <div className="nr-rank-sub">{product.brand}</div>
          </div>

          <ScoreBox score={getProductScore(product, type)} />
        </div>
      ))}
    </div>
  );
}

export default SimilarProducts;
