import React from 'react';
import CategoryPage from '../components/CategoryPage';

// Défini hors du composant : une nouvelle référence à chaque rendu
// invaliderait inutilement le filtrage mémoïsé de <CategoryPage />.
const FILTERS = [
  { id: 'brand', label: 'Marque', options: ['Intel', 'AMD'] },
  { id: 'cores', label: 'Cœurs', options: [6, 8, 10, 12, 14, 16, 20, 24] },
];

function CpuPage() {
  return (
    <CategoryPage
      collection="cpus"
      type="cpu"
      filterOptions={FILTERS}
      intro="Processeurs classés par score CompareTech, calculé depuis Geekbench 6 (70 % multi-cœur, 30 % mono-cœur)."
    />
  );
}

export default CpuPage;
