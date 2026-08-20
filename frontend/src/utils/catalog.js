import { API_BASE } from '../api';

/*
 * Cache mémoire des collections de produits.
 *
 * Pourquoi : sur une fiche produit, la même collection était demandée par
 * l'en-tête (index de recherche) et par la fiche elle-même. L'en-tête charge
 * en plus les quatre collections à chaque montage de l'application. Cela
 * faisait cinq requêtes là où deux suffisent — sur le palier gratuit de
 * Render, où chaque appel peut réveiller l'instance, c'est loin d'être neutre.
 *
 * Le cache mémorise la *promesse*, pas seulement le résultat : deux appels
 * simultanés partagent alors une seule requête réseau au lieu d'en lancer
 * deux et d'en jeter une.
 *
 * Durée de vie courte et invalidation explicite après écriture : un
 * comparateur peut servir des données vieilles d'une minute, jamais des
 * données qu'on vient soi-même de modifier.
 */

const TTL_MS = 60000;

// Au-delà, on abandonne et on propose de réessayer plutôt que de tourner
// indéfiniment. L'API dort sur le palier gratuit de Render et peut mettre
// 20 à 50 secondes à se réveiller.
const TIMEOUT_MS = 75000;

const cache = new Map();

/** Vide le cache d'une collection, ou de toutes si aucune n'est précisée. */
export function invalidateCatalog(collection) {
  if (collection) cache.delete(collection);
  else cache.clear();
}

/**
 * Charge une collection (`cpus`, `gpus`, `laptops`, `telephones`).
 * @returns {Promise<any[]>} le tableau de produits, ou une erreur au message
 *                           déjà formulé pour l'affichage.
 */
export function loadCatalog(collection, { force = false } = {}) {
  const hit = cache.get(collection);
  if (!force && hit && Date.now() - hit.at < TTL_MS) return hit.promise;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const promise = fetch(`${API_BASE}/${collection}`, { signal: controller.signal })
    .then(response => {
      if (!response.ok) throw new Error(`Le serveur a répondu ${response.status}.`);
      return response.json();
    })
    .then(payload => {
      // Une réponse bien formée est toujours un tableau : si ce n'en est pas
      // un, mieux vaut le signaler que de laisser .filter() planter plus loin.
      if (!Array.isArray(payload)) throw new Error('Réponse inattendue du serveur.');
      return payload;
    })
    .catch(error => {
      // Un échec ne doit surtout pas rester en cache : sans cette ligne, une
      // coupure réseau passagère condamnerait la collection pour une minute.
      cache.delete(collection);

      if (error.name === 'AbortError') {
        throw new Error("Le serveur n'a pas répondu à temps.");
      }
      if (error.message === 'Failed to fetch') {
        throw new Error('Impossible de joindre le serveur.');
      }
      throw error;
    })
    .finally(() => clearTimeout(timer));

  cache.set(collection, { at: Date.now(), promise });
  return promise;
}

export default loadCatalog;
