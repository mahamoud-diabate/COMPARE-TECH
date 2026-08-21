import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import ProductList from './ProductList';
import CompareBar from './CompareBar';
import FilterSidebar from './FilterSidebar';
import AnimatedPage from './AnimatedPage';
import LoadingSpinner from './LoadingSpinner';
import ErrorState from './ErrorState';
import { useCollection } from '../hooks/useCollection';
import { usePageTitle } from '../hooks/usePageTitle';
import { getProductScore } from '../utils/scores';

const MAX_COMPARE_ITEMS = 3;

const BREADCRUMB = {
  cpu: 'Processeurs',
  gpu: 'Cartes graphiques',
  laptop: 'Ordinateurs portables',
  telephone: 'Téléphones',
};

/**
 * Page catégorie, commune aux quatre types de produits.
 *
 * Les quatre pages précédentes étaient la même page copiée quatre fois : même
 * état, même filtrage, même gestion de la sélection, à la liste d'options
 * près. Seules ces options restent propres à chaque catégorie ; elles sont
 * passées en `filterOptions`.
 *
 * Le filtrage est volontairement générique : un groupe de filtres porte
 * l'identifiant du champ qu'il filtre, et une valeur cochée doit être égale à
 * celle du produit. C'est exactement ce que faisaient les quatre pages.
 */
function CategoryPage({ collection, type, filterOptions = [], intro, introSansNote }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState(() =>
    Object.fromEntries(filterOptions.map(group => [group.id, []]))
  );
  const [compareList, setCompareList] = useState([]);

  const { data, loading, error, coldStart, retry } = useCollection(collection);

  /*
   * Une catégorie dont aucun produit n'est noté n'est pas un classement : c'est
   * une liste. Le titre et l'introduction le disent, plutôt que de promettre un
   * tri par score qui n'existe pas — les portables sont dans ce cas tant que
   * leur benchmark n'est pas relevé.
   *
   * Déduit des données, pas déclaré : le jour où les mesures arrivent, la page
   * redevient un classement toute seule.
   */
  const noteDisponible = data.some(produit => getProductScore(produit, type) > 0);
  const introAffichee = noteDisponible ? intro : (introSansNote || intro);

  usePageTitle(
    `${BREADCRUMB[type] || collection} : ${noteDisponible ? 'classement par score' : 'catalogue'}`,
    introAffichee
  );

  const handleFilterChange = (groupId, value) => {
    setSelectedFilters(prev => {
      const current = prev[groupId] || [];
      return {
        ...prev,
        [groupId]: current.includes(value)
          ? current.filter(item => item !== value)
          : [...current, value],
      };
    });
  };

  const resetFilters = () =>
    setSelectedFilters(Object.fromEntries(filterOptions.map(group => [group.id, []])));

  const handleCompareToggle = (product) => {
    setCompareList(prev => {
      if (prev.some(item => item._id === product._id)) {
        return prev.filter(item => item._id !== product._id);
      }
      if (prev.length >= MAX_COMPARE_ITEMS) {
        toast.error(`Limite de ${MAX_COMPARE_ITEMS} produits atteinte.`);
        return prev;
      }
      return [...prev, { ...product, productType: type }];
    });
  };

  const filtered = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    return data.filter(product => {
      const matchesSearch =
        !needle ||
        (product.name || '').toLowerCase().includes(needle) ||
        (product.brand || '').toLowerCase().includes(needle);
      if (!matchesSearch) return false;

      return filterOptions.every(group => {
        const selected = selectedFilters[group.id] || [];
        return selected.length === 0 || selected.includes(product[group.id]);
      });
    });
  }, [data, searchTerm, selectedFilters, filterOptions]);

  const compareIds = compareList.map(item => item._id);

  return (
    <>
      <AnimatedPage>
        <div className="ct-main-wide">
          <div className="ct-breadcrumb">
            <span><Link to="/">Accueil</Link></span>
            <span>{BREADCRUMB[type] || collection}</span>
          </div>

          {introAffichee && (
            <p className="ct-text-gray-small" style={{ padding: '0 4px 8px' }}>{introAffichee}</p>
          )}

          <div className="ct-layout">
            <FilterSidebar
              filters={filterOptions}
              selectedFilters={selectedFilters}
              onFilterChange={handleFilterChange}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onReset={resetFilters}
            />

            <main>
              {loading ? (
                <LoadingSpinner message="Chargement du catalogue…" coldStart={coldStart} />
              ) : error ? (
                <ErrorState message={error} onRetry={retry} />
              ) : (
                <ProductList
                  cpus={filtered}
                  compareList={compareIds}
                  onCompareToggle={handleCompareToggle}
                  productType={type}
                  compareType={type}
                />
              )}
            </main>
          </div>
        </div>
      </AnimatedPage>

      {/* Volontairement hors de <AnimatedPage> : c'est une surcouche de
          l'interface, pas du contenu de page. À l'intérieur, elle héritait du
          bloc conteneur créé par l'animation et son `position: fixed` se
          calait sur le bas du contenu au lieu du bas de la fenêtre. */}
      {compareList.length > 0 && (
        <CompareBar
          selectedItems={compareList}
          productType={type}
          onClear={() => setCompareList([])}
          onRemove={handleCompareToggle}
        />
      )}
    </>
  );
}

export default CategoryPage;
