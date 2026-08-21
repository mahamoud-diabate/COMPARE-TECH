import React from 'react';
import { useParams } from 'react-router-dom';

import ProductDetail from '../components/ProductDetail';
import DetailSkeleton from '../components/DetailSkeleton';
import ErrorState from '../components/ErrorState';
import AnimatedPage from '../components/AnimatedPage';
import { useProduct } from '../hooks/useProduct';

// Toute la mise en page vit dans <ProductDetail /> : les quatre categories
// partagent la meme fiche, seul le jeu de caracteristiques change (voir
// utils/specs.js).
function TelephoneDetailPage() {
  const { id } = useParams();
  const { product, loading, error, statut, retry } = useProduct('telephones', id, 'telephone');

  if (loading) return <DetailSkeleton />;
  if (error) return <ErrorState message={error} statut={statut} onRetry={retry} />;

  return (
    <AnimatedPage>
      <ProductDetail product={product} type="telephone" />
    </AnimatedPage>
  );
}

export default TelephoneDetailPage;
