import React from 'react';
import CategoryPage from '../components/CategoryPage';

const FILTERS = [
  { id: 'brand', label: 'Marque', options: ['Nvidia', 'AMD', 'Intel'] },
  { id: 'memory_gb', label: 'Mémoire vidéo', options: [8, 12, 16, 20, 24], unit: 'Go' },
];

function GpuPage() {
  return (
    <CategoryPage
      collection="gpus"
      type="gpu"
      filterOptions={FILTERS}
      intro="Cartes graphiques classées par score CompareTech, calculé depuis le résultat 3DMark."
    />
  );
}

export default GpuPage;
