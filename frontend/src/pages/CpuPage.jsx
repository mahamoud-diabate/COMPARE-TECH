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

function CpuPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: cpus, loading, error, coldStart, retry } = useCollection('cpus');

  const [selectedFilters, setSelectedFilters] = useState({
    brand: [],
    cores: []
  });

  const [compareList, setCompareList] = useState([]);
  const MAX_COMPARE_ITEMS = 3;

  const filterOptions = [
    { id: 'brand', label: 'Marque', options: ["Intel", "AMD"] },
    { id: 'cores', label: 'Nombre de Cœurs', options: [6, 8, 10, 12, 14, 16, 20, 24] }
  ];

  const handleFilterChange = (groupId, value) => {
    setSelectedFilters(prev => {
      const groupFilters = prev[groupId] || [];
      const newGroupFilters = groupFilters.includes(value)
        ? groupFilters.filter(item => item !== value)
        : [...groupFilters, value];
      
      return { ...prev, [groupId]: newGroupFilters };
    });
  };

  const handleCompareToggle = (product) => {
    setCompareList(prevList => {
      const isSelected = prevList.some(item => item._id === product._id);
      if (isSelected) return prevList.filter(item => item._id !== product._id);
      if (prevList.length >= MAX_COMPARE_ITEMS) {
          toast.error(`Limite de ${MAX_COMPARE_ITEMS} produits atteinte.`);
          return prevList;
      }
      return [...prevList, { ...product, productType: 'cpu' }];
    });
  };

  const filteredCpus = cpus.filter(cpu => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = cpu.name.toLowerCase().includes(searchLower) || 
                          cpu.brand.toLowerCase().includes(searchLower);
    
    const matchesBrand = selectedFilters.brand.length === 0 || selectedFilters.brand.includes(cpu.brand);
    const matchesCores = selectedFilters.cores.length === 0 || selectedFilters.cores.includes(cpu.cores);

    return matchesSearch && matchesBrand && matchesCores;
  });

  const compareIds = compareList.map(item => item._id);

  return (
    <AnimatedPage>
      <Hero searchTerm={searchTerm} onSearchChange={setSearchTerm} />
      
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
                <LoadingSpinner message="Analyse des processeurs en cours..." coldStart={coldStart} />
              ) : error ? (
                <ErrorState message={error} onRetry={retry} />
              ) : (
                <ProductList
                  cpus={filteredCpus} 
                  compareList={compareIds}
                  onCompareToggle={handleCompareToggle}
                  productType="cpu"
                  compareType="cpu"
                  maxItems={MAX_COMPARE_ITEMS}
                />
              )}
            </main>
          </Col>
        </Row>
      </Container>

      {compareList.length > 0 && (
        <CompareBar selectedItems={compareList} productType="cpu" onClear={() => setCompareList([])} />
      )}
    </AnimatedPage>
  );
}

export default CpuPage;