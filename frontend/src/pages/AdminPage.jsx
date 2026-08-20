import { API_BASE, adminFetch, clearToken } from '../api';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { SPEC_GROUPS } from '../utils/specs';
import { invalidateCatalog } from '../utils/catalog';
import { usePageTitle } from '../hooks/usePageTitle';

const COLLECTIONS = [
  { value: 'cpus', type: 'cpu', label: 'Processeurs' },
  { value: 'gpus', type: 'gpu', label: 'Cartes graphiques' },
  { value: 'laptops', type: 'laptop', label: 'Ordinateurs portables' },
  { value: 'telephones', type: 'telephone', label: 'Téléphones' },
];

// Champs stockés en Number côté Mongo (voir backend/models/*.js). Sert à la
// fois à choisir le type d'input et à convertir avant l'envoi : une chaîne
// "16" enregistrée dans un champ Number casse ensuite tous les tris.
const NUMERIC_FIELDS = new Set([
  'cores', 'threads', 'ram_gb', 'storage_gb', 'battery_mah', 'memory_gb',
  'geekbench_single', 'geekbench_multi', 'benchmark_3dmark', 'antutu_score',
  'display_brightness_nits', 'battery_life_hours',
]);

const EMPTY = { name: '', brand: '', imageUrl: '', pros: '', cons: '' };

/**
 * Administration du catalogue.
 *
 * Les champs de spécifications sont dérivés de `utils/specs.js`, la même
 * source que le tableau comparatif et la fiche produit. L'ancien formulaire
 * listait ses champs à la main : il ne permettait pas de saisir la fréquence
 * de base ni le Geekbench mono-cœur, pourtant affichés côté public, et
 * proposait à l'inverse un prix et un TDP qu'aucun modèle Mongo n'enregistre.
 */
function AdminPage() {
  const [collection, setCollection] = useState('cpus');
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  usePageTitle('Gestion du catalogue');

  const type = COLLECTIONS.find(c => c.value === collection)?.type || 'cpu';

  // Champs éditables de la catégorie courante, marque exclue : elle a son
  // propre champ dans l'en-tête du formulaire.
  const specFields = (SPEC_GROUPS[type] || [])
    .flatMap(group => group.rows)
    .filter(row => row.key !== 'brand');

  // Toujours en direct, sans cache : l'administrateur doit voir l'état réel de
  // la base, y compris juste après sa propre modification. L'invalidation vaut
  // aussi pour le reste du site, qui repartira sur des données fraîches.
  const fetchProducts = useCallback(() => {
    invalidateCatalog(collection);
    fetch(`${API_BASE}/${collection}`)
      .then(res => res.json())
      .then(data => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]));
  }, [collection]);

  useEffect(() => {
    fetchProducts();
    setEditingId(null);
    setFormData(EMPTY);
  }, [fetchProducts]);

  const handleChange = (e) =>
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleEdit = (product) => {
    setEditingId(product._id);
    setFormData({
      ...EMPTY,
      ...product,
      pros: Array.isArray(product.pros) ? product.pros.join(', ') : product.pros || '',
      cons: Array.isArray(product.cons) ? product.cons.join(', ') : product.cons || '',
    });
    window.scrollTo(0, 0);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData(EMPTY);
  };

  const handleDelete = async (id, name) => {
    if (saving) return;
    if (!window.confirm(`Supprimer définitivement « ${name} » ?`)) return;
    setSaving(true);
    try {
      const response = await adminFetch(`${API_BASE}/${collection}/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Suppression refusée par le serveur.');
      toast.success('Produit supprimé.');
      fetchProducts();
    } catch (error) {
      toast.error(error.message || 'Erreur lors de la suppression.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Verrou de soumission : sans lui, trois clics impatients sur « Ajouter »
    // créent trois fois le produit. Le bouton reste inerte tant que le serveur
    // n'a pas répondu, succès ou échec.
    if (saving) return;
    setSaving(true);

    const payload = { ...formData };
    NUMERIC_FIELDS.forEach(field => {
      if (payload[field] !== undefined && payload[field] !== '') {
        payload[field] = Number(payload[field]);
      }
    });

    ['pros', 'cons'].forEach(field => {
      if (typeof payload[field] === 'string') {
        payload[field] = payload[field].split(',').map(s => s.trim()).filter(Boolean);
      }
    });

    try {
      const response = editingId
        ? await adminFetch(`${API_BASE}/${collection}/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await adminFetch(`${API_BASE}/${collection}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([payload]),
          });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Enregistrement refusé.');
      }

      toast.success(editingId ? 'Produit modifié.' : 'Produit ajouté.');
      setFormData(EMPTY);
      setEditingId(null);
      fetchProducts();
    } catch (error) {
      // adminFetch remonte un message précis (401 / 503 / 429) : l'afficher
      // plutôt qu'un « erreur serveur » générique qui masque la cause.
      toast.error(error.message || 'Erreur serveur.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    toast.success('Déconnecté.');
    navigate('/login');
  };

  return (
    <div className="nr-main-wide">
      <div className="nr-breadcrumb">
        <span>Administration</span>
      </div>

      <section className="nr-card">
        <div className="nr-toolbar">
          <h1 className="nr-title-h2">Gestion du catalogue</h1>
          <button className="nr-btn nr-btn-ghost nr-btn-sm" onClick={handleLogout}>
            Déconnexion
          </button>
        </div>

        <form className="nr-card-body" onSubmit={handleSubmit}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div className="nr-title-h4" style={{ paddingBottom: 0 }}>
              {editingId ? 'Modifier un produit' : 'Ajouter un produit'}
            </div>
            {editingId && (
              <button type="button" className="nr-btn nr-btn-ghost nr-btn-sm" onClick={handleCancel}>
                Annuler l’édition
              </button>
            )}
          </div>

          <label className="nr-label" htmlFor="admin-collection">Catégorie</label>
          <select
            id="admin-collection"
            className="nr-select"
            style={{ width: '100%', marginBottom: 14 }}
            value={collection}
            onChange={(e) => setCollection(e.target.value)}
            disabled={Boolean(editingId)}
          >
            {COLLECTIONS.map(item => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>

          <div className="nr-two-col">
            <div style={{ marginBottom: 12 }}>
              <label className="nr-label" htmlFor="admin-name">Nom</label>
              <input
                id="admin-name"
                className="nr-input"
                style={{ width: '100%' }}
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="nr-label" htmlFor="admin-brand">Marque</label>
              <input
                id="admin-brand"
                className="nr-input"
                style={{ width: '100%' }}
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <label className="nr-label" htmlFor="admin-image">URL de l’image</label>
          <input
            id="admin-image"
            className="nr-input"
            style={{ width: '100%', marginBottom: 16 }}
            name="imageUrl"
            value={formData.imageUrl}
            onChange={handleChange}
            placeholder="https://…"
          />

          <hr className="nr-card-sep" style={{ margin: '0 0 14px' }} />

          <div className="nr-title-h4">Spécifications</div>
          <div className="nr-two-col">
            {specFields.map(field => (
              <div key={field.key} style={{ marginBottom: 12 }}>
                <label className="nr-label" htmlFor={`admin-${field.key}`}>
                  {field.label}{field.unit ? ` (${field.unit})` : ''}
                </label>
                <input
                  id={`admin-${field.key}`}
                  className="nr-input"
                  style={{ width: '100%' }}
                  type={NUMERIC_FIELDS.has(field.key) ? 'number' : 'text'}
                  step="any"
                  name={field.key}
                  value={formData[field.key] ?? ''}
                  onChange={handleChange}
                />
              </div>
            ))}
          </div>

          <hr className="nr-card-sep" style={{ margin: '0 0 14px' }} />

          <div className="nr-title-h4">Analyse</div>
          <p className="nr-text-gray-small" style={{ marginBottom: 10 }}>
            Un élément par virgule.
          </p>

          <label className="nr-label" htmlFor="admin-pros">Avantages</label>
          <textarea
            id="admin-pros"
            className="nr-input"
            style={{ width: '100%', marginBottom: 12 }}
            rows={2}
            name="pros"
            value={formData.pros}
            onChange={handleChange}
            placeholder="Écran lumineux, Autonomie confortable"
          />

          <label className="nr-label" htmlFor="admin-cons">Inconvénients</label>
          <textarea
            id="admin-cons"
            className="nr-input"
            style={{ width: '100%', marginBottom: 16 }}
            rows={2}
            name="cons"
            value={formData.cons}
            onChange={handleChange}
            placeholder="Chauffe en charge, Charge lente"
          />

          <button
            className="nr-btn"
            type="submit"
            disabled={saving}
            aria-busy={saving}
            style={{ width: '100%' }}
          >
            {saving
              ? 'Enregistrement…'
              : editingId
                ? 'Enregistrer les modifications'
                : 'Ajouter le produit'}
          </button>
        </form>
      </section>

      <section className="nr-card">
        <div className="nr-toolbar">
          <h2 className="nr-title-h2">Produits enregistrés</h2>
          <span className="nr-text-gray-small">{products.length}</span>
        </div>

        {products.length === 0 ? (
          <p className="nr-empty">Aucun produit dans cette catégorie.</p>
        ) : (
          <div className="nr-table-wrap">
            <table className="nr-table">
              <thead>
                <tr>
                  <th style={{ width: 64 }}>Visuel</th>
                  <th>Nom</th>
                  <th style={{ width: 140 }}>Marque</th>
                  <th style={{ width: 150 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product._id}>
                    <td>
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt=""
                          style={{ width: 40, height: 34, objectFit: 'contain' }}
                        />
                      ) : (
                        <span className="nr-text-gray-small">—</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{product.name}</td>
                    <td className="cell-v">{product.brand}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="nr-chip"
                          onClick={() => handleEdit(product)}
                        >
                          Modifier
                        </button>
                        <button
                          className="nr-chip"
                          style={{ color: 'var(--nr-minus)' }}
                          onClick={() => handleDelete(product._id, product.name)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminPage;
