import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../api';

// Délai au-delà duquel on considère que l'API est en train de démarrer.
// L'API est hébergée sur le palier gratuit de Render, qui met l'instance en
// veille après inactivité : le premier appel peut prendre 20 à 50 secondes.
// Sans message, l'utilisateur ne voit qu'une page vide et croit à une panne.
const COLD_START_MS = 4000;

// Au-delà, on abandonne et on propose de réessayer plutôt que de tourner
// indéfiniment.
const TIMEOUT_MS = 75000;

/**
 * Charge une collection de l'API (`cpus`, `gpus`, `laptops`, `telephones`).
 *
 * Retourne l'état complet du chargement — y compris l'échec, que les pages
 * ignoraient auparavant (un `console.error` puis une liste vide sans
 * explication).
 *
 * @returns {{data: any[], loading: boolean, error: string|null, coldStart: boolean, retry: () => void}}
 */
export function useCollection(collection) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coldStart, setColdStart] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Permet à retry() de relancer l'effet sans dépendre de `data`.
  const retry = useCallback(() => setAttempt(n => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();

    // Deux raisons distinctes d'annuler la requête, à ne surtout pas confondre :
    //  - `cancelled` : l'effet est démonté (changement de page, ou double
    //    montage de StrictMode en dev). Le résultat ne concerne plus personne,
    //    on l'ignore en silence.
    //  - `timedOut`  : le délai est dépassé. Là, il FAUT afficher l'erreur.
    // Ces drapeaux sont locaux à l'exécution de l'effet : une variable partagée
    // (ref) serait réécrite par le montage suivant et ferait passer une
    // annulation de StrictMode pour un vrai dépassement de délai.
    let cancelled = false;
    let timedOut = false;

    setLoading(true);
    setError(null);
    setColdStart(false);

    const coldTimer = setTimeout(() => {
      if (!cancelled) setColdStart(true);
    }, COLD_START_MS);

    const abortTimer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, TIMEOUT_MS);

    fetch(`${API_BASE}/${collection}`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Le serveur a répondu ${response.status}.`);
        }
        return response.json();
      })
      .then(payload => {
        if (cancelled) return;
        // Une réponse bien formée est toujours un tableau : si ce n'en est pas
        // un, mieux vaut le signaler que de laisser .filter() planter plus loin.
        if (!Array.isArray(payload)) {
          throw new Error('Réponse inattendue du serveur.');
        }
        setData(payload);
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;

        if (err.name === 'AbortError') {
          if (timedOut) {
            setError("Le serveur n'a pas répondu à temps.");
            setLoading(false);
          }
          return;
        }

        console.error(`Chargement de ${collection} impossible :`, err);
        setError(
          err.message === 'Failed to fetch'
            ? 'Impossible de joindre le serveur.'
            : err.message
        );
        setLoading(false);
      })
      .finally(() => {
        clearTimeout(coldTimer);
        clearTimeout(abortTimer);
      });

    return () => {
      cancelled = true;
      clearTimeout(coldTimer);
      clearTimeout(abortTimer);
      controller.abort();
    };
  }, [collection, attempt]);

  return { data, loading, error, coldStart, retry };
}

export default useCollection;
