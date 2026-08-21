import { API_BASE } from '../api';
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

import SpecTable from '../components/SpecTable';
import TechRadar from '../components/TechRadar';
import CategoryScores from '../components/CategoryScores';
import BenchmarkBars from '../components/BenchmarkBars';
import KeyDifferences from '../components/KeyDifferences';
import ProsCons from '../components/ProsCons';
import Verdict from '../components/Verdict';
import CompareSelector from '../components/CompareSelector';
import { ScoreChip } from '../components/Score';
import { ImageOff } from 'lucide-react';
import { getProductScore } from '../utils/scores';
import { resolveType } from '../utils/specs';
import { usePageTitle } from '../hooks/usePageTitle';
import { cheminProduit } from '../utils/liens';

const TYPE_LABEL = {
  cpu: 'processeurs',
  gpu: 'cartes graphiques',
  laptop: 'ordinateurs portables',
  telephone: 'téléphones',
};

const SECTIONS = [
  { key: 'differences', label: 'Différences', needsTwo: true },
  { key: 'evaluation', label: 'Évaluation' },
  { key: 'benchmarks', label: 'Benchmarks' },
  { key: 'radar', label: 'Radar', needsTwo: true },
  { key: 'specs', label: 'Spécifications' },
  { key: 'verdict', label: 'Verdict', needsTwo: true },
];

const TYPE_PATH = {
  cpu: '/cpus',
  gpu: '/gpus',
  laptop: '/laptops',
  telephone: '/telephones',
};

/**
 * Page de comparaison.
 *
 * Organisation reprise des comparateurs de référence : d'abord la synthèse
 * (qui gagne et de combien), ensuite les notes par critère, puis les mesures
 * brutes, et seulement à la fin le tableau exhaustif. Le lecteur pressé
 * s'arrête après le premier bloc, le lecteur méticuleux descend.
 *
 * Le graphique en barres Chart.js a été retiré : il redisait ce que montrent
 * déjà les barres de benchmark, avec une échelle normalisée moins lisible que
 * les valeurs réelles.
 */
function ComparePage() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false);
  const [activeSection, setActiveSection] = useState('differences');

  const sectionsRef = useRef({});

  // Titre de l'onglet : les deux noms, comme l'en-tête de la page. Calculé
  // avant les retours anticipés — un hook ne peut pas être conditionnel.
  const names = products.map(p => p.name).join(' vs ');
  usePageTitle(
    names && `${names} : lequel choisir ?`,
    names && `Comparatif détaillé : ${names}. Différences clés, notes par critère, benchmarks et tableau complet.`
  );

  const productType = searchParams.get('type') || '';
  const idsString = searchParams.get('ids') || '';
  const type = resolveType(productType);

  useEffect(() => {
    if (!idsString || !productType) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const collectionName = productType.endsWith('s') ? productType : `${productType}s`;

    fetch(`${API_BASE}/${collectionName}/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: idsString.split(',') }),
    })
      .then(response => {
        if (!response.ok) throw new Error('Comparatif indisponible');
        return response.json();
      })
      .then(data => setProducts(data.map(item => ({ ...item, productType }))))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [idsString, productType]);

  /*
   * Onglet actif suivi au défilement.
   *
   * Sans cela, l'onglet ne changeait qu'au clic : après avoir fait défiler la
   * page à la main, la navigation annonçait une section qu'on avait quittée
   * depuis longtemps. La marge haute compense l'en-tête collant, la marge
   * basse évite qu'une section à peine entrée par le bas prenne la main.
   */
  useEffect(() => {
    if (products.length === 0) return undefined;

    const entries = Object.entries(sectionsRef.current).filter(([, node]) => node);
    if (entries.length === 0) return undefined;

    const keyByNode = new Map(entries.map(([key, node]) => [node, key]));
    const visible = new Set();

    const observer = new IntersectionObserver(
      (records) => {
        records.forEach(record => {
          const key = keyByNode.get(record.target);
          if (!key) return;
          if (record.isIntersecting) visible.add(key);
          else visible.delete(key);
        });

        // La section active est la première de l'ordre de lecture encore à
        // l'écran, pas la dernière signalée par l'observateur.
        const current = SECTIONS.find(section => visible.has(section.key));
        if (current) setActiveSection(current.key);
      },
      { rootMargin: '-60px 0px -55% 0px' }
    );

    entries.forEach(([, node]) => observer.observe(node));
    return () => observer.disconnect();
  }, [products]);


  if (loading) {
    return (
      <div className="nr-main">
        <div className="nr-card">
          <div className="nr-empty">
            <div className="nr-spinner" role="status" aria-label="Chargement" />
            <div style={{ marginTop: 10 }}>Chargement du comparatif…</div>
          </div>
        </div>
      </div>
    );
  }

  // Sans produits demandés, la page n'est pas en erreur : c'est le point de
  // départ d'une comparaison. On propose donc de les choisir, au lieu de
  // renvoyer vers une page catégorie comme le faisait la version précédente.
  if (!idsString) {
    return <CompareSelector type={type} />;
  }

  if (error || products.length === 0) {
    return (
      <div className="nr-main">
        <div className="nr-card">
          <div className="nr-empty">
            <p style={{ marginBottom: 12 }}>
              {error || 'Ces produits sont introuvables : ils ont pu être retirés du catalogue.'}
            </p>
            <Link className="nr-btn" to={`/compare${type ? `?type=${type}` : ''}`}>
              Choisir des produits
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const [p1, p2] = products;
  const scores = products.map(p => getProductScore(p, productType));

  // Une égalité de score est fréquente en haut de tableau, et annoncer malgré
  // tout « le meilleur » — en l'occurrence le premier arrivé — ferait dire aux
  // chiffres l'inverse de ce qu'ils montrent.
  const bestScore = Math.max(...scores);
  const leaders = products.filter((_, i) => scores[i] === bestScore);

  const sections = SECTIONS.filter(section => !section.needsTwo || Boolean(p2));

  const register = (key) => (node) => { sectionsRef.current[key] = node; };

  return (
    <div className="nr-main">
      <div className="nr-breadcrumb">
        <span><Link to="/">Accueil</Link></span>
        {type && <span><Link to={TYPE_PATH[type]}>{TYPE_LABEL[type]}</Link></span>}
        <span>Comparatif</span>
      </div>

      <section className="nr-card">
        <div className="nr-card-head">
          <h1 className="nr-title-h1">{names}</h1>
        </div>

        <div className="nr-card-body" style={{ paddingTop: 8 }}>
          <div className="nr-compare-head">
            {products.map((product, index) => (
              <React.Fragment key={product._id}>
                {index > 0 && <div className="nr-compare-head-vs">VS</div>}
                <div className="nr-compare-head-item">
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                    <ScoreChip score={scores[index]} />
                  </div>
                  {product.imageUrl ? (
                    <img className="nr-compare-head-img" src={product.imageUrl} alt={product.name} />
                  ) : (
                    <div className="nr-compare-head-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ImageOff size={28} strokeWidth={1.5} color="#9aa0a6" />
                    </div>
                  )}
                  <Link className="nr-compare-head-name" to={cheminProduit(type, product)}>
                    {product.name}
                  </Link>
                  <span className="nr-compare-head-brand">{product.brand}</span>
                </div>
              </React.Fragment>
            ))}
          </div>

          {p2 && (
            <p className="nr-text-gray-small" style={{ marginTop: 12 }}>
              Comparatif de {products.length} {TYPE_LABEL[type] || 'produits'}.{' '}
              {bestScore > 0 && (
                leaders.length > 1 ? (
                  <>
                    <strong>{leaders.map(p => p.name).join(' et ')}</strong> obtiennent la même
                    note globale ({bestScore}/100).
                  </>
                ) : (
                  <>
                    <strong>{leaders[0].name}</strong> obtient la meilleure note globale
                    ({bestScore}/100).
                  </>
                )
              )}{' '}
              Les blocs ci-dessous détaillent les écarts, critère par critère, à partir des
              seules valeurs mesurées.
            </p>
          )}
        </div>

      </section>

      {/* Hors de la carte : `.nr-card` porte `overflow: hidden`, qui empêche
          tout `position: sticky` interne de coller. La barre reste donc
          visible pendant tout le défilement — sans quoi le suivi de section
          qu'elle affiche ne servirait à personne.
          De vrais liens d'ancrage : partageables, ouvrables dans un nouvel
          onglet, fonctionnels sans JavaScript. */}
      <nav className="nr-anchor-nav nr-anchor-nav-sticky" aria-label="Sections du comparatif">
        {sections.map(section => (
          <a
            key={section.key}
            href={`#${section.key}`}
            className={activeSection === section.key ? 'is-active' : ''}
            aria-current={activeSection === section.key ? 'true' : undefined}
          >
            {section.label}
          </a>
        ))}
      </nav>

      <div id="differences" ref={register('differences')}>
        <KeyDifferences products={products} productType={productType} />
      </div>

      <div id="evaluation" ref={register('evaluation')}>
        <CategoryScores products={products} productType={productType} />
      </div>

      <div id="benchmarks" ref={register('benchmarks')}>
        <BenchmarkBars
          products={products}
          productType={productType}
          subtitle="Valeurs brutes. La longueur du filet est relative au meilleur résultat du comparatif."
        />
      </div>

      <div id="radar" ref={register('radar')}>
        {p1 && p2 && (
          <section className="nr-card">
            <div className="nr-card-head">
              <h2 className="nr-title-h2">Profil comparé</h2>
              <p className="nr-text-gray-small">
                Chaque axe est une caractéristique réellement mesurée, ramenée sur 100.
              </p>
            </div>
            <div className="nr-card-body">
              <div style={{ maxWidth: 420, margin: '0 auto' }}>
                <TechRadar products={products} productType={productType} />
              </div>
            </div>
          </section>
        )}
      </div>

      <div id="specs" ref={register('specs')}>
        {/* Hors de la carte, pour la même raison que la barre d'ancres :
            `overflow: hidden` sur .nr-card annule `position: sticky`. Le
            conteneur neutre limite la barre à la zone du tableau — elle
            n'apparaît pas ailleurs sur la page. */}
        <div className="nr-sticky-names">
          <span className="nr-sticky-names-label">Comparés :</span>
          {products.map((product, index) => (
            <React.Fragment key={product._id}>
              {index > 0 && <span className="nr-sticky-names-vs">vs</span>}
              <span className="nr-sticky-names-item">{product.name}</span>
            </React.Fragment>
          ))}
        </div>

        <section className="nr-card">
        <div className="nr-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <h2 className="nr-title-h2">Spécifications</h2>
            <p className="nr-text-gray-small" style={{ marginBottom: 12 }}>
              Cellule verte : valeur la plus favorable de la ligne.
            </p>
          </div>
          <button
            type="button"
            className={`nr-chip${showDifferencesOnly ? ' is-on' : ''}`}
            onClick={() => setShowDifferencesOnly(v => !v)}
          >
            Différences seulement
          </button>
        </div>
          <SpecTable
            products={products}
            productType={productType}
            showDifferencesOnly={showDifferencesOnly}
          />
        </section>
      </div>

      {products.map(product => (
        <ProsCons
          key={product._id}
          product={product}
          title={`Points forts et limites — ${product.name}`}
        />
      ))}

      <div id="verdict" ref={register('verdict')}>
        <Verdict products={products} productType={productType} />
      </div>
    </div>
  );
}

export default ComparePage;
