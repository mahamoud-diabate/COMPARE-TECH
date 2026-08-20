import React from 'react';
import CategoryPage from '../components/CategoryPage';

const FILTERS = [
  { id: 'brand', label: 'Marque', options: ['Apple', 'Samsung', 'Google', 'Xiaomi', 'OnePlus'] },
  { id: 'ram_gb', label: 'Mémoire vive', options: [6, 8, 12, 16], unit: 'Go' },
  { id: 'storage_gb', label: 'Stockage', options: [128, 256, 512, 1024], unit: 'Go' },
];

function TelephonePage() {
  return (
    <CategoryPage
      collection="telephones"
      type="telephone"
      filterOptions={FILTERS}
      intro="Téléphones classés par score CompareTech, calculé depuis le total AnTuTu."
    />
  );
}

export default TelephonePage;
