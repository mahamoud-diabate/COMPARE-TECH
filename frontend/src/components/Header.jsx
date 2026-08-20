import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Moon, Sun, Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import { loadCatalog } from '../utils/catalog';

const TYPE_LABEL = { cpu: 'CPU', gpu: 'GPU', laptop: 'Portable', telephone: 'Téléphone' };

/**
 * En-tête du site : marque, recherche globale, navigation, thème.
 *
 * Une seule barre de recherche pour tous les formats — l'ancienne version en
 * dupliquait une pour le mobile, ce qui obligeait à synchroniser deux refs et
 * deux listes de suggestions pour un résultat identique.
 */
function Header({ toggleTheme, theme }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [open, setOpen] = useState(false);
  const [menuOuvert, setMenuOuvert] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const menuBoutonRef = useRef(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const endpoints = [
          ['cpus', 'cpu'],
          ['gpus', 'gpu'],
          ['laptops', 'laptop'],
          ['telephones', 'telephone'],
        ];
        // Passe par le cache partagé : les pages catégorie et les fiches
        // produit demandent les mêmes collections, une seule requête suffit.
        const responses = await Promise.all(endpoints.map(([path]) => loadCatalog(path)));
        setAllProducts(
          responses.flatMap((list, i) =>
            (Array.isArray(list) ? list : []).map(p => ({ ...p, productType: endpoints[i][1] }))
          )
        );
      } catch {
        // Recherche indisponible hors ligne : le reste du site fonctionne.
      }
    };
    fetchAll();
  }, []);

  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const needle = searchTerm.toLowerCase();
    setSuggestions(
      allProducts
        .filter(p =>
          (p.name && p.name.toLowerCase().includes(needle)) ||
          (p.brand && p.brand.toLowerCase().includes(needle))
        )
        .slice(0, 7)
    );
    setOpen(true);
  }, [searchTerm, allProducts]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const select = (product) => {
    navigate(`/${product.productType || 'cpu'}/${product._id}`);
    setSearchTerm('');
    setOpen(false);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (suggestions.length > 0) select(suggestions[0]);
  };

  return (
    <header className="nr-header">
      <div className="nr-header-inner">
        <button
          className="nr-icon-btn"
          ref={menuBoutonRef}
          onClick={() => setMenuOuvert(true)}
          aria-label="Ouvrir le menu"
          aria-expanded={menuOuvert}
        >
          <Menu size={18} strokeWidth={2} />
        </button>

        <Link to="/" className="nr-logo">
          Compare<em>Tech</em>
        </Link>

        <div className="nr-search" ref={searchRef}>
          <form onSubmit={onSubmit}>
            <span className="nr-search-icon"><Search size={14} strokeWidth={2} /></span>
            <input
              type="search"
              placeholder="Rechercher un produit…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => suggestions.length > 0 && setOpen(true)}
              autoComplete="off"
              aria-label="Rechercher un produit"
            />
          </form>

          {open && suggestions.length > 0 && (
            <div className="nr-search-drop">
              {suggestions.map(product => (
                <button
                  key={product._id}
                  type="button"
                  className="nr-search-item"
                  onClick={() => select(product)}
                >
                  <span style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block' }}>{product.name}</strong>
                    <span className="nr-text-gray-small">{product.brand}</span>
                  </span>
                  <span className="nr-badge">{TYPE_LABEL[product.productType]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          className="nr-icon-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Passer en clair' : 'Passer en sombre'}
          aria-label="Changer de thème"
          style={{ marginLeft: 'auto' }}
        >
          {theme === 'dark' ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
        </button>
      </div>

      <Sidebar
        ouvert={menuOuvert}
        onClose={() => setMenuOuvert(false)}
        boutonRef={menuBoutonRef}
      />
    </header>
  );
}

export default Header;
