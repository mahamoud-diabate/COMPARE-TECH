// Point d'accès unique à l'API backend.
// Définir VITE_API_BASE (racine, SANS /api) dans .env ou chez l'hébergeur (Vercel) :
//   VITE_API_BASE=https://mahamoud-compare-tech-api.onrender.com
//
// Sans valeur explicite, la racine dépend du contexte :
//  - en développement, chaîne vide : les appels partent en `/api`, donc en même
//    origine, et le proxy de vite.config.js les relaie. L'API déployée refuse
//    l'origine localhost (liste blanche CORS côté backend), un appel direct
//    échouerait avec un 403.
//  - au build, l'API déployée, appelée en absolu depuis le domaine de prod.
const FALLBACK = import.meta.env.DEV ? '' : 'https://mahamoud-compare-tech-api.onrender.com';

export const API_ROOT = (import.meta.env.VITE_API_BASE || FALLBACK).replace(/\/$/, '');
export const API_BASE = `${API_ROOT}/api`;

/*
 * Authentification par JWT.
 *
 * La connexion (page /login) échange le nom d'utilisateur + mot de passe contre
 * un jeton signé côté serveur. Le jeton est ensuite envoyé dans l'en-tête
 * "Authorization: Bearer …" sur chaque écriture. Le mot de passe ne transite
 * jamais dans le bundle : seule une preuve à durée limitée (le jeton) y est
 * stockée, dans le localStorage du navigateur.
 */
const TOKEN_KEY = 'ct_admin_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return Boolean(getToken());
}

// Connexion : appelle /api/auth/login et stocke le jeton reçu.
export async function login(username, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Connexion impossible.');
  }
  if (!data.token) {
    throw new Error('Réponse du serveur invalide.');
  }
  setToken(data.token);
  return data.token;
}

function authHeaders(extra = {}) {
  const token = getToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
}

// Wrapper pour les appels d'écriture : ajoute le Bearer token et remonte
// un message d'erreur exploitable plutôt qu'un échec silencieux.
export async function adminFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: authHeaders(options.headers || {})
  });

  if (response.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Session expirée : reconnecte-toi.');
  }
  if (response.status === 503) {
    throw new Error('Écritures désactivées côté serveur (authentification non configurée).');
  }
  if (response.status === 429) {
    throw new Error('Trop de requêtes. Réessaie dans quelques minutes.');
  }
  return response;
}
