import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// API visée par le proxy de développement. Même valeur de repli que
// `src/api.js` : les deux doivent rester alignées.
const API_TARGET =
  process.env.VITE_API_BASE || 'https://mahamoud-compare-tech-api.onrender.com'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  /*
   * Proxy de développement.
   *
   * L'API déployée n'autorise que l'origine de production dans sa liste
   * blanche CORS (voir backend/server.js) : appelée depuis localhost:5173,
   * elle répond 403 avant même de servir les données. Plutôt que d'élargir
   * cette liste — et donc d'affaiblir la politique de production pour un
   * confort de développement — le navigateur appelle ici `/api` en même
   * origine, et Vite relaie la requête côté serveur.
   *
   * `origin` est retiré de la requête relayée : sans en-tête d'origine, le
   * backend traite l'appel comme un appel serveur-à-serveur et l'autorise
   * (les écritures restent protégées par le jeton d'administration).
   *
   * Ne concerne que `npm run dev`. Le build de production continue de viser
   * l'API en absolu.
   */
  server: {
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        configure(proxy) {
          proxy.on('proxyReq', proxyReq => proxyReq.removeHeader('origin'))
        },
      },
    },
  },
})
