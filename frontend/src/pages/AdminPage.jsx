import { API_BASE, adminFetch, clearToken } from '../api';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { SPEC_GROUPS } from '../utils/specs';
import { toutesLesCles } from '../../../shared/criteres.js';
import { valeurPresente } from '../../../shared/provenance.js';
import { invalidateCatalog } from '../utils/catalog';
import { usePageTitle } from '../hooks/usePageTitle';

const COLLECTIONS = [
  { value: 'cpus', type: 'cpu', label: 'Processeurs' },
  { value: 'gpus', type: 'gpu', label: 'Cartes graphiques' },
  { value: 'laptops', type: 'laptop', label: 'Ordinateurs portables' },
  { value: 'telephones', type: 'telephone', label: 'Téléphones' },
];

// Champs stockés en Number côté Mongo : ce sont exactement les critères
// déclarés dans `shared/criteres.js` (un test du backend le vérifie). Sert à
// choisir le type d'input, à convertir avant l'envoi — une chaîne "16" dans
// un champ Number casse ensuite tous les tris — et à exiger une source.
const NUMERIC_FIELDS = new Set(toutesLesCles());

const aujourdHui = () => new Date().toISOString().slice(0, 10);

/** Provenance reçue de l'API -> valeurs de formulaire (date au format AAAA-MM-JJ). */
function provenanceEnFormulaire(provenance) {
  const resultat = {};
  for (const [cle, source] of Object.entries(provenance || {})) {
    if (!source) continue;
    resultat[cle] = {
      url: source.url || '',
      releve_le: source.releve_le ? String(source.releve_le).slice(0, 10) : '',
      extrait: source.extrait || '',
    };
  }
  return resultat;
}

const EMPTY = { name: '', brand: '', imageUrl: '', pros: '', cons: '', provenance: {} };

/**
 * Source d'une mesure : URL, date du relevé, et l'extrait de la page qui
 * contient la valeur. Exigée par le serveur pour toute mesure renseignée.
 *
 * La vérification « la valeur figure dans l'extrait » est faite ici en direct,
 * avec la même fonction que le serveur (`shared/provenance.js`) : le verdict
 * affiché pendant la saisie est celui qui tombera à l'enregistrement.
 */
function ChampsSource({ cle, valeur, source, onChange }) {
  const renseignee = valeur !== undefined && valeur !== null && valeur !== '';
  if (!renseignee) return null;

  const s = source || { url: '', releve_le: '', extrait: '' };
  const nombre = Number(valeur);
  const prouvee = s.extrait && Number.isFinite(nombre) ? valeurPresente(s.extrait, nombre) : null;

  return (
    <fieldset className="ct-admin-source">
      <legend className="ct-text-gray-small">Source de cette valeur</legend>
      <input
        className="ct-input"
        type="url"
        placeholder="URL de la page"
        aria-label={`URL de la source (${cle})`}
        value={s.url}
        onChange={e => onChange(cle, 'url', e.target.value)}
      />
      <input
        className="ct-input"
        type="date"
        aria-label={`Date du relevé (${cle})`}
        value={s.releve_le}
        onChange={e => onChange(cle, 'releve_le', e.target.value)}
      />
      <input
        className="ct-input"
        placeholder="Extrait exact contenant la valeur, ex. « Total Cores 24 »"
        aria-label={`Extrait de la source (${cle})`}
        value={s.extrait}
        onChange={e => onChange(cle, 'extrait', e.target.value)}
      />
      {prouvee !== null && (
        <span className={`ct-text-gray-small ${prouvee ? 'is-ok' : 'is-ko'}`}>
          {prouvee
            ? '✓ La valeur figure dans l’extrait.'
            : `✗ ${valeur} n’apparaît pas dans l’extrait : le serveur refusera.`}
        </span>
      )}
    </fieldset>
  );
}

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
  // Motifs de refus renvoyés par le serveur : affichés dans le formulaire,
  // où l'on peut les corriger, plutôt que dans une notification qui s'efface.
  const [refus, setRefus] = useState([]);
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
    setRefus([]);
  }, [fetchProducts]);

  const handleChange = e => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  // Source d'une mesure. La date se remplit d'elle-même à la première saisie
  // d'une URL : c'est presque toujours le jour du relevé.
  const handleSource = (cle, champ, valeur) =>
    setFormData(prev => {
      const actuelle = prev.provenance?.[cle] || { url: '', releve_le: '', extrait: '' };
      const suivante = { ...actuelle, [champ]: valeur };
      if (champ === 'url' && valeur && !actuelle.releve_le) suivante.releve_le = aujourdHui();
      return { ...prev, provenance: { ...prev.provenance, [cle]: suivante } };
    });

  const handleEdit = product => {
    setEditingId(product._id);
    setFormData({
      ...EMPTY,
      ...product,
      pros: Array.isArray(product.pros) ? product.pros.join(', ') : product.pros || '',
      cons: Array.isArray(product.cons) ? product.cons.join(', ') : product.cons || '',
      provenance: provenanceEnFormulaire(product.provenance),
    });
    setRefus([]);
    window.scrollTo(0, 0);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData(EMPTY);
    setRefus([]);
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

  const handleSubmit = async e => {
    e.preventDefault();

    // Verrou de soumission : sans lui, trois clics impatients sur « Ajouter »
    // créent trois fois le produit. Le bouton reste inerte tant que le serveur
    // n'a pas répondu, succès ou échec.
    if (saving) return;
    setSaving(true);

    const payload = { ...formData };
    NUMERIC_FIELDS.forEach(field => {
      if (payload[field] === '')
        payload[field] = null; // champ vidé : mesure retirée
      else if (payload[field] !== undefined && payload[field] !== null) {
        payload[field] = Number(payload[field]);
      }
    });

    // Une source par mesure renseignée, et seulement celles-là : une source
    // laissée derrière une valeur effacée ne prouverait plus rien.
    const provenance = {};
    for (const cle of NUMERIC_FIELDS) {
      const source = formData.provenance?.[cle];
      if (payload[cle] === undefined || payload[cle] === null || !source) continue;
      if (source.url || source.extrait) provenance[cle] = source;
    }
    payload.provenance = provenance;

    ['pros', 'cons'].forEach(field => {
      if (typeof payload[field] === 'string') {
        payload[field] = payload[field]
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
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
            body: JSON.stringify(payload),
          });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setRefus(Array.isArray(errorData.erreurs) ? errorData.erreurs : []);
        throw new Error(errorData.error || errorData.message || 'Enregistrement refusé.');
      }
      setRefus([]);

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
    <div className="ct-main-wide">
      <div className="ct-breadcrumb">
        <span>Administration</span>
      </div>

      <section className="ct-card">
        <div className="ct-toolbar">
          <h1 className="ct-title-h2">Gestion du catalogue</h1>
          <button className="ct-btn ct-btn-ghost ct-btn-sm" onClick={handleLogout}>
            Déconnexion
          </button>
        </div>

        <form className="ct-card-body" onSubmit={handleSubmit}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div className="ct-title-h4" style={{ paddingBottom: 0 }}>
              {editingId ? 'Modifier un produit' : 'Ajouter un produit'}
            </div>
            {editingId && (
              <button
                type="button"
                className="ct-btn ct-btn-ghost ct-btn-sm"
                onClick={handleCancel}
              >
                Annuler l’édition
              </button>
            )}
          </div>

          <label className="ct-label" htmlFor="admin-collection">
            Catégorie
          </label>
          <select
            id="admin-collection"
            className="ct-select"
            style={{ width: '100%', marginBottom: 14 }}
            value={collection}
            onChange={e => setCollection(e.target.value)}
            disabled={Boolean(editingId)}
          >
            {COLLECTIONS.map(item => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <div className="ct-two-col">
            <div style={{ marginBottom: 12 }}>
              <label className="ct-label" htmlFor="admin-name">
                Nom
              </label>
              <input
                id="admin-name"
                className="ct-input"
                style={{ width: '100%' }}
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="ct-label" htmlFor="admin-brand">
                Marque
              </label>
              <input
                id="admin-brand"
                className="ct-input"
                style={{ width: '100%' }}
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <label className="ct-label" htmlFor="admin-image">
            URL de l’image
          </label>
          <input
            id="admin-image"
            className="ct-input"
            style={{ width: '100%', marginBottom: 16 }}
            name="imageUrl"
            value={formData.imageUrl}
            onChange={handleChange}
            placeholder="https://…"
          />

          <hr className="ct-card-sep" style={{ margin: '0 0 14px' }} />

          <div className="ct-title-h4">Spécifications</div>
          <div className="ct-two-col">
            {specFields.map(field => (
              <div key={field.key} style={{ marginBottom: 12 }}>
                <label className="ct-label" htmlFor={`admin-${field.key}`}>
                  {field.label}
                  {field.unit ? ` (${field.unit})` : ''}
                </label>
                <input
                  id={`admin-${field.key}`}
                  className="ct-input"
                  style={{ width: '100%' }}
                  type={NUMERIC_FIELDS.has(field.key) ? 'number' : 'text'}
                  step="any"
                  name={field.key}
                  value={formData[field.key] ?? ''}
                  onChange={handleChange}
                />
                {NUMERIC_FIELDS.has(field.key) && (
                  <ChampsSource
                    cle={field.key}
                    valeur={formData[field.key]}
                    source={formData.provenance?.[field.key]}
                    onChange={handleSource}
                  />
                )}
              </div>
            ))}
          </div>

          <hr className="ct-card-sep" style={{ margin: '0 0 14px' }} />

          <div className="ct-title-h4">Analyse</div>
          <p className="ct-text-gray-small" style={{ marginBottom: 10 }}>
            Un élément par virgule.
          </p>

          <label className="ct-label" htmlFor="admin-pros">
            Avantages
          </label>
          <textarea
            id="admin-pros"
            className="ct-input"
            style={{ width: '100%', marginBottom: 12 }}
            rows={2}
            name="pros"
            value={formData.pros}
            onChange={handleChange}
            placeholder="Écran lumineux, Autonomie confortable"
          />

          <label className="ct-label" htmlFor="admin-cons">
            Inconvénients
          </label>
          <textarea
            id="admin-cons"
            className="ct-input"
            style={{ width: '100%', marginBottom: 16 }}
            rows={2}
            name="cons"
            value={formData.cons}
            onChange={handleChange}
            placeholder="Chauffe en charge, Charge lente"
          />

          {refus.length > 0 && (
            <div className="ct-admin-refus" role="alert">
              <strong>Le serveur a refusé la fiche :</strong>
              <ul>
                {refus.map((motif, i) => (
                  <li key={i}>{motif}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            className="ct-btn"
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

      <section className="ct-card">
        <div className="ct-toolbar">
          <h2 className="ct-title-h2">Produits enregistrés</h2>
          <span className="ct-text-gray-small">{products.length}</span>
        </div>

        {products.length === 0 ? (
          <p className="ct-empty">Aucun produit dans cette catégorie.</p>
        ) : (
          <div className="ct-table-wrap">
            <table className="ct-table">
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
                        <span className="ct-text-gray-small">—</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{product.name}</td>
                    <td className="cell-v">{product.brand}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="ct-chip" onClick={() => handleEdit(product)}>
                          Modifier
                        </button>
                        <button
                          className="ct-chip"
                          style={{ color: 'var(--ct-minus)' }}
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
