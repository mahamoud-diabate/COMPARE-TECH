import React, { useState } from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import toast from 'react-hot-toast';

import Hero from '../components/Hero';
import ProductList from '../components/ProductList';
import CompareBar from '../components/CompareBar';
import FilterSidebar from '../components/FilterSidebar';
import AnimatedPage from '../components/AnimatedPage';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import { useCollection } from '../hooks/useCollection';

const AVAILABLE_BRANDS = ["Dell", "Apple", "Asus", "Lenovo", "HP", "Acer", "MSI","Razer"];

function LaptopPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: laptops, loading, error, coldStart, retry } = useCollection('laptops');

  const [selectedFilters, setSelectedFilters] = useState({
    brand: [],
    ram_gb: [],
    storage_gb: []
  });
  
  const [compareList, setCompareList] = useState([]);
  const MAX_COMPARE_ITEMS = 3;

  const filterOptions = [
    { id: 'brand', label: 'Marque', options: AVAILABLE_BRANDS },
    { id: 'ram_gb', label: 'Mémoire RAM', options: [8, 16, 32, 64], unit: 'GB' },
    { id: 'storage_gb', label: 'Stockage', options: [256, 512, 1024, 2048], unit: 'GB' }
  ];

  const handleCompareToggle = (product) => {
    setCompareList(prevList => {
      const isSelected = prevList.some(item => item._id === product._id);

      if (isSelected) {
        return prevList.filter(item => item._id !== product._id);
      } else {
        if (prevList.length >= MAX_COMPARE_ITEMS) {
          toast.error(`Limite de ${MAX_COMPARE_ITEMS} produits atteinte.`);
          return prevList;
        }
        return [...prevList, { ...product, productType: 'laptop' }];
      }
    });
  };

  const handleFilterChange = (groupId, value) => {
    setSelectedFilters(prev => {
      const groupFilters = prev[groupId] || [];
      const newGroupFilters = groupFilters.includes(value)
        ? groupFilters.filter(item => item !== value)
        : [...groupFilters, value];
      
      return { ...prev, [groupId]: newGroupFilters };
    });
  };

  const filteredLaptops = laptops.filter(laptop => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = laptop.name.toLowerCase().includes(searchLower) || 
                          laptop.brand.toLowerCase().includes(searchLower);
    
    const matchesBrand = selectedFilters.brand.length === 0 || selectedFilters.brand.includes(laptop.brand);
    const matchesRam = selectedFilters.ram_gb.length === 0 || selectedFilters.ram_gb.includes(laptop.ram_gb);
    const matchesStorage = selectedFilters.storage_gb.length === 0 || selectedFilters.storage_gb.includes(laptop.storage_gb);

    return matchesSearch && matchesBrand && matchesRam && matchesStorage;
  });

  const compareIds = compareList.map(item => item._id);

  return (
    <AnimatedPage>
      <Hero 
        searchTerm={searchTerm} 
        onSearchChange={setSearchTerm} 
      />
      
      <Container className="my-5">
        <Row>
          <Col md={3}>
            <FilterSidebar 
              filters={filterOptions}
              selectedFilters={selectedFilters}
              onFilterChange={handleFilterChange}
            />
          </Col>
          
          <Col md={9}>
            <main>
              {loading ? (
                <LoadingSpinner message="Recherche des meilleurs ordinateurs portables..." coldStart={coldStart} />
              ) : error ? (
                <ErrorState message={error} onRetry={retry} />
              ) : (
                <ProductList
                  cpus={filteredLaptops} 
                  compareList={compareIds}
                  onCompareToggle={handleCompareToggle}
                  productType="laptop"
                  compareType="laptop"
                  maxItems={MAX_COMPARE_ITEMS}
                />
              )}
            </main>
          </Col>
        </Row>
      </Container>

      {compareList.length > 0 && (
        <CompareBar 
            selectedItems={compareList} 
            productType="laptop" 
            onClear={() => setCompareList([])}
        />
      )}
    </AnimatedPage>
  );
}

export default LaptopPage;