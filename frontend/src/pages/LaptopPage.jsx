import React from 'react';
import CategoryPage from '../components/CategoryPage';

const FILTERS = [
  {
    id: 'brand',
    label: 'Marque',
    options: ['Dell', 'Apple', 'Asus', 'Lenovo', 'HP', 'Acer', 'MSI', 'Razer'],
  },
  { id: 'ram_gb', label: 'Mémoire vive', options: [8, 16, 32, 64], unit: 'Go' },
  { id: 'storage_gb', label: 'Stockage', options: [256, 512, 1024, 2048], unit: 'Go' },
];

function LaptopPage() {
  return (
    <CategoryPage
      collection="laptops"
      type="laptop"
      filterOptions={FILTERS}
      intro="Ordinateurs portables classés par score CompareTech, calculé depuis Geekbench 6 multi-cœur."
    />
  );
}

export default LaptopPage;
