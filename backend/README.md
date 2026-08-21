# Backend — CompareTech API

API REST construite avec Node.js, Express et MongoDB pour alimenter la plateforme CompareTech.

## Installation et démarrage

```bash
# Installation des dépendances
npm install

# Lancer en développement (avec nodemon)
npm run dev

# Lancer en production
npm start

# Exécuter les tests unitaires
npm test
```

## Variables d'environnement (`.env`)

```env
PORT=3001
DB_URI=mongodb://localhost:27017/compare-tech
JWT_SECRET=votre_secret_jwt
ADMIN_PASSWORD=votre_mot_de_passe_admin
GEMINI_API_KEY=votre_cle_gemini
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

## Endpoints principaux

- `GET /api/cpus` — Liste des processeurs
- `GET /api/gpus` — Liste des cartes graphiques
- `GET /api/laptops` — Liste des ordinateurs portables
- `GET /api/telephones` — Liste des smartphones
- `GET /api/featured` — Produits mis en avant
- `POST /api/ai/verdict` — Synthèse comparative générée
- `POST /api/auth/login` — Authentification administrateur
