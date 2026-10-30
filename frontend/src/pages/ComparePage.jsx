import { API_BASE } from '../api';
import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

import CompareSelector from '../components/CompareSelector';
import EnteteMarche from '../components/marche/EnteteMarche';
import CriteresMarche from '../components/marche/CriteresMarche';
import SourcesMarche from '../components/marche/SourcesMarche';
import Verdict from '../components/Verdict';
import { resolveType, buildKeyDifferences, buildStrengths } from '../utils/specs';
import { loadCatalog } from '../utils/catalog';
import { usePageTitle } from '../hooks/usePageTitle';

const TYPE_LABEL = {
  cpu: 'processeurs',
  gpu: 'cartes graphiques',
  laptop: 'ordinateurs portables',
  telephone: 'téléphones',
};

const TYPE_PATH = {
  cpu: '/cpus',
  gpu: '/gpus',
  laptop: '/laptops',
  telephone: '/telephones',
};

/**
 * Page de comparaison « dans le marché ».
 *
 * Trois blocs au lieu de six. Les six sections précédentes (différences,
 * évaluation, benchmarks, radar, spécifications, verdict) répétaient la même
 * mesure jusqu'à trois fois, et reprenaient l'ordre de NanoReview. Ici :
 *  1. qui gagne, et où chacun se situe parmi toute la catégorie ;
 *  2. critère par critère, chaque valeur une seule fois, avec son rang ;
 *  3. un tiroir fermé pour fouiller : tableau complet, formule et sources.
 *
 * Situer un produit demande la catégorie entière. Elle vient du cache déjà
 * partagé avec l'en-tête du site (`loadCatalog`) : aucune requête de plus
 * dans le cas courant. Si elle échoue, la page reste utilisable, réduite aux
 * produits comparés.
 */
function ComparePage() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [catalogue, setCatalogue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const names = products.map(p => p.name).join(' vs ');
  usePageTitle(
    names && `${names} : lequel choisir ?`,
    names &&
      `Comparatif : ${names}. Qui l'emporte, et où chacun se situe parmi tous les modèles du site.`
  );

  const productType = searchParams.get('type') || '';
  const idsString = searchParams.get('ids') || '';
  const type = resolveType(productType);

  useEffect(() => {
    if (!idsString || !productType) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const collectionName = productType.endsWith('s') ? productType : `${productType}s`;

    fetch(`${API_BASE}/${collectionName}/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: idsString.split(',') }),
    })
      .then(response => {
        if (!response.ok) throw new Error('Comparatif indisponible');
        return response.json();
      })
      .then(data => setProducts(data.map(item => ({ ...item, productType }))))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));

    loadCatalog(collectionName)
      .then(setCatalogue)
      .catch(() => setCatalogue([]));
  }, [idsString, productType]);

  if (loading) {
    return (
      <div className="ct-main">
        <div className="ct-card">
          <div className="ct-empty">
            <div className="ct-spinner" role="status" aria-label="Chargement" />
            <div style={{ marginTop: 10 }}>Chargement du comparatif…</div>
          </div>
        </div>
      </div>
    );
  }

  // Sans produits demandés, la page n'est pas en erreur : c'est le point de
  // départ d'une comparaison.
  if (!idsString) {
    return <CompareSelector type={type} />;
  }

  if (error || products.length === 0) {
    return (
      <div className="ct-main">
        <div className="ct-card">
          <div className="ct-empty">
            <p style={{ marginBottom: 12 }}>
              {error || 'Ces produits sont introuvables : ils ont pu être retirés du catalogue.'}
            </p>
            <Link className="ct-btn" to={`/compare${type ? `?type=${type}` : ''}`}>
              Choisir des produits
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Le catalogue sert de référence ; s'il n'est pas (encore) chargé, les
  // produits comparés suffisent à afficher la page, avec des rangs relatifs
  // à eux seuls plutôt qu'une page vide.
  const reference = catalogue.length ? catalogue : products;
  const libelleCategorie = TYPE_LABEL[type] || 'produits';

  const avantages =
    products.length === 2
      ? (() => {
          const diff = buildKeyDifferences(products[0], products[1], productType);
          return [diff.a, diff.b];
        })()
      : buildStrengths(products, productType);

  return (
    <div className="ct-main">
      <div className="ct-breadcrumb">
        <span>
          <Link to="/">Accueil</Link>
        </span>
        {type && (
          <span>
            <Link to={TYPE_PATH[type]}>{libelleCategorie}</Link>
          </span>
        )}
        <span>Comparatif</span>
      </div>

      <EnteteMarche
        produits={products}
        catalogue={reference}
        productType={productType}
        type={type}
        libelleCategorie={libelleCategorie}
        avantages={avantages}
      />

      <CriteresMarche
        produits={products}
        catalogue={reference}
        productType={productType}
        libelleCategorie={libelleCategorie}
      />

      <SourcesMarche produits={products} productType={productType} />

      {/* L'analyse rédigée par l'IA reste une option déclenchée par le
          lecteur, après les mesures : le chiffre est vérifiable, le
          commentaire ne l'est pas. */}
      <Verdict products={products} productType={productType} analyseSeule />
    </div>
  );
}

export default ComparePage;
