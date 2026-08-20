import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../api';

/**
 * Charge une fiche produit.
 *
 * Les quatre pages de détail répétaient le même useEffect avec la même
 * gestion d'erreur partielle. Le type est injecté dans l'objet retourné :
 * tous les composants d'affichage (radar, barres, tableau) s'appuient dessus
 * pour choisir le bon jeu de caractéristiques.
 *
 * @param {string} collection - 'cpus' | 'gpus' | 'laptops' | 'telephones'
 * @param {string} id         - identifiant Mongo
 * @param {string} type       - 'cpu' | 'gpu' | 'laptop' | 'telephone'
 */
export function useProduct(collection, id, type) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt(n => n + 1), []);

  useEffect(() => {
    if (!id) return undefined;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/${collection}/${id}`)
      .then(response => {
        if (response.status === 404) throw new Error('Ce produit n’existe pas ou plus.');
        if (!response.ok) throw new Error(`Le serveur a répondu ${response.status}.`);
        return response.json();
      })
      .then(data => {
        if (cancelled) return;
        setProduct({ ...data, productType: type });
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        setError(
          err.message === 'Failed to fetch'
            ? 'Impossible de joindre le serveur.'
            : err.message
        );
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [collection, id, type, attempt]);

  return { product, loading, error, retry };
}

export default useProduct;
