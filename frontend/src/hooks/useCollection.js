import { useState, useEffect, useCallback } from 'react';
import { loadCatalog } from '../utils/catalog';

// Délai au-delà duquel on considère que l'API est en train de démarrer.
// L'API est hébergée sur le palier gratuit de Render, qui met l'instance en
// veille après inactivité : le premier appel peut prendre 20 à 50 secondes.
// Sans message, l'utilisateur ne voit qu'une page vide et croit à une panne.
const COLD_START_MS = 4000;

/**
 * Charge une collection de l'API (`cpus`, `gpus`, `laptops`, `telephones`).
 *
 * Le transport, le cache et le délai maximal vivent dans `utils/catalog.js` ;
 * ce hook ne s'occupe que de l'état d'affichage. Un « réessayer » force le
 * rechargement : c'est le seul cas où l'on veut ignorer le cache.
 *
 * @returns {{data: any[], loading: boolean, error: string|null, coldStart: boolean, retry: () => void}}
 */
export function useCollection(collection) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coldStart, setColdStart] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt(n => n + 1), []);

  useEffect(() => {
    // Le résultat d'un effet démonté ne concerne plus personne : on l'ignore
    // au lieu d'annuler la requête, qui alimente le cache pour la suite.
    let cancelled = false;

    setLoading(true);
    setError(null);
    setColdStart(false);

    const coldTimer = setTimeout(() => {
      if (!cancelled) setColdStart(true);
    }, COLD_START_MS);

    loadCatalog(collection, { force: attempt > 0 })
      .then(payload => {
        if (cancelled) return;
        setData(payload);
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        console.error(`Chargement de ${collection} impossible :`, err);
        setError(err.message);
        setLoading(false);
      })
      .finally(() => clearTimeout(coldTimer));

    return () => {
      cancelled = true;
      clearTimeout(coldTimer);
    };
  }, [collection, attempt]);

  return { data, loading, error, coldStart, retry };
}

export default useCollection;
