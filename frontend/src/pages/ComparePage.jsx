import { API_BASE } from '../api';
import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
} from 'chart.js';
import CompareTable from '../components/CompareTable';
import TechRadar from '../components/TechRadar';
import Verdict from '../components/Verdict';
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import { getProductScore } from '../utils/scores';

// Le radar est rendu par TechRadar (recharts) : seules les échelles du
// graphique à barres restent à enregistrer côté Chart.js.
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false);
  const [activeView, setActiveView] = useState('overview');

  const productType = searchParams.get('type') || '';
  const idsString = searchParams.get('ids') || '';

  useEffect(() => {
    if (idsString && productType) {
      setLoading(true);
      const idsArray = idsString.split(',');
      const collectionName = productType.endsWith('s') ? productType : `${productType}s`;
      const apiUrl = `${API_BASE}/${collectionName}/compare`;

      fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsArray }),
      })
        .then(response => response.json())
        .then(data => {
          const typedData = data.map(item => ({ ...item, productType }));
          setProducts(typedData);
        })
        .catch(error => console.error("Erreur:", error))
        .finally(() => setLoading(false));
    }
  }, [idsString, productType]);

  if (loading) {
    return (
      <Container className="my-5">
        <div className="text-center">
          <h3 className="ct-section-title mb-4">Chargement du comparatif...</h3>
          <div className="spinner-border text-primary" role="status" style={{width:'3rem', height:'3rem'}} />
        </div>
      </Container>
    );
  }

  if (products.length === 0) {
    return (
      <Container className="my-5 text-center">
        <h3 className="ct-section-title mb-3">Aucun produit à comparer</h3>
        <p className="text-muted mb-4">Sélectionnez des produits depuis les pages catégories pour lancer une comparaison.</p>
        <Link to="/"><Button variant="primary">← Retour à l'accueil</Button></Link>
      </Container>
    );
  }

  const product1 = products[0];
  const product2 = products.length > 1 ? products[1] : null;

  // Bar chart data
  const chartLabels = products.map(p => p.name?.substring(0, 20));
  let datasets = [];

  if (productType === 'laptop') {
    const perfData = products.map(p => Math.round(((p.geekbench_multi || 0) / 22000) * 100));
    const screenData = products.map(p => Math.round(((p.display_brightness_nits || 0) / 1600) * 100));
    const batteryData = products.map(p => Math.round(((p.battery_life_hours || 0) / 20) * 100));
    datasets = [
      { label: 'Performance', data: perfData, backgroundColor: '#3b82f6', borderRadius: 6 },
      { label: 'Écran', data: screenData, backgroundColor: '#f59e0b', borderRadius: 6 },
      { label: 'Autonomie', data: batteryData, backgroundColor: '#10b981', borderRadius: 6 },
    ];
  } else {
    const scoreData = products.map(p => getProductScore(p, productType));
    datasets = [
      { label: 'Score Global', data: scoreData, backgroundColor: '#3b82f6', borderRadius: 6 },
    ];
  }

  const barData = { labels: chartLabels, datasets };
  const barOptions = {
    indexAxis: productType === 'laptop' ? 'x' : 'y',
    scales: { x: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }, y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } } },
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#94a3b8' } } },
  };

  return (
    <Container className="my-5 ct-compare-page">
      {/* Header */}
      <div className="text-center mb-5">
        <Badge bg="primary" className="mb-3 px-3 py-2">
          Comparatif {productType?.toUpperCase()}
        </Badge>
        <Row className="align-items-center justify-content-center mb-4">
          {products.map((p, index) => (
            <React.Fragment key={p._id}>
              <Col xs={5} md={4}>
                <Card className="ct-compare-product-card p-3">
                  {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="ct-compare-img mb-2" />}
                  <h4 className="fw-bold mb-1" style={{fontSize:'1rem'}}>{p.name}</h4>
                  <Badge bg="dark" className="border">{p.brand}</Badge>
                </Card>
              </Col>
              {index < products.length - 1 && (
                <Col xs={2} md={1}>
                  <div className="ct-vs-badge">VS</div>
                </Col>
              )}
            </React.Fragment>
          ))}
        </Row>

        {/* View Tabs */}
        <div className="ct-view-tabs mb-4">
          {[
            { key: 'overview', label: '📊 Vue d\'ensemble' },
            { key: 'radar', label: '🎯 Radar' },
            { key: 'specs', label: '📋 Spécifications' },
          ].map(tab => (
            <button
              key={tab.key}
              className={`ct-view-tab ${activeView === tab.key ? 'active' : ''}`}
              onClick={() => setActiveView(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview View */}
      {activeView === 'overview' && (
        <>
          <Card className="ct-chart-card mb-5">
            <Card.Body className="p-4">
              <h3 className="text-center mb-4 fw-bold">Analyse des Performances</h3>
              <div style={{ maxWidth: '800px', height: '400px', margin: 'auto' }}>
                <Bar options={barOptions} data={barData} />
              </div>
            </Card.Body>
          </Card>
          <Verdict products={products} productType={productType} />
        </>
      )}

      {/* Radar View */}
      {activeView === 'radar' && product1 && product2 && (
        <Card className="ct-chart-card mb-5">
          <Card.Body className="p-4">
            <h3 className="text-center mb-2 fw-bold">Comparaison Radar</h3>
            <p className="text-center text-muted small mb-4">
              Chaque axe correspond à une caractéristique réellement mesurée,
              ramenée sur une échelle de 0 à 100.
            </p>
            <div style={{ maxWidth: '600px', height: '450px', margin: 'auto' }}>
              <TechRadar product1={product1} product2={product2} productType={productType} />
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Specs View */}
      {activeView === 'specs' && (
        <>
          <div className="d-flex justify-content-end mb-3">
            <Form.Check
              type="switch"
              id="diff-switch"
              label={<span className="text-muted">Différences seulement</span>}
              checked={showDifferencesOnly}
              onChange={() => setShowDifferencesOnly(!showDifferencesOnly)}
            />
          </div>
          <CompareTable products={products} showDifferencesOnly={showDifferencesOnly} />
        </>
      )}
    </Container>
  );
}

export default ComparePage;
