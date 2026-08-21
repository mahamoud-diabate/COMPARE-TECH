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

/*
 * Deux introductions, et c'est la donnée qui choisit.
 *
 * Tant qu'aucun portable n'a de benchmark, la page s'annonce pour ce qu'elle
 * est : un catalogue, pas un classement. Notebookcheck mesure bien Geekbench,
 * mais publie le résultat dans un graphique rendu en JavaScript — ni un relevé
 * manuel ni le contrôle automatique ne peuvent le lire. Plutôt que de dériver
 * la note du processeur (un même modèle perd 30 à 50 % en châssis fin), elle
 * reste absente, et la page le dit.
 */
function LaptopPage() {
  return (
    <CategoryPage
      collection="laptops"
      type="laptop"
      filterOptions={FILTERS}
      intro="Ordinateurs portables classés par score CompareTech, calculé depuis Geekbench 6 multi-cœur."
      introSansNote="Ordinateurs portables référencés avec leurs caractéristiques mesurées : autonomie, luminosité, mémoire. La note CompareTech demande un résultat Geekbench 6, que nos sources ne publient pas encore sous une forme vérifiable — ces fiches restent donc non notées."
    />
  );
}

export default LaptopPage;
