# Backend — COMPARE-TECH API

API REST construite avec Node.js, Express et MongoDB pour alimenter la plateforme COMPARE-TECH.

## Installation et démarrage

```bash
npm install
cp .env.example .env   # puis renseigner les valeurs
npm start              # http://localhost:3001
npm test               # tests unitaires (node --test, ni base ni réseau)
```

## Variables d'environnement (`.env`)

Le fichier [`.env.example`](.env.example) fait foi : il liste chaque variable
avec son rôle, sa valeur par défaut et ce qui se passe si elle est absente.

```env
DB_URI=mongodb://localhost:27017/compare-tech
ADMIN_USERNAME=admin
ADMIN_PASSWORD=votre_mot_de_passe_admin
JWT_SECRET=votre_secret_jwt
GEMINI_API_KEY=votre_cle_gemini
GEMINI_MODEL=gemini-2.0-flash
CORS_ORIGINS=http://localhost:5173
NODE_ENV=development
PORT=3001
```

Sans `ADMIN_PASSWORD` ni `JWT_SECRET`, les routes d'écriture répondent 503
plutôt que de s'ouvrir : un oubli de configuration ne doit jamais aboutir à une
API sans protection. Sans `GEMINI_API_KEY`, seule la route IA répond 503, le
reste fonctionne normalement.

## Endpoints publics

- `GET /api/health` — état du service et de la connexion à la base
- `GET /api/cpus` — liste des processeurs
- `GET /api/gpus` — liste des cartes graphiques
- `GET /api/laptops` — liste des ordinateurs portables
- `GET /api/telephones` — liste des smartphones
- `GET /api/<collection>/:idOuSlug` — une fiche, par identifiant Mongo ou par slug
- `POST /api/<collection>/compare` — plusieurs fiches d'un coup (10 maximum)
- `GET /api/featured` — produits mis en avant
- `POST /api/ai/verdict` — synthèse comparative générée
- `POST /api/auth/login` — authentification administrateur

### Pagination

Les quatre collections acceptent `?limit=&page=`, tous deux facultatifs :

```
GET /api/gpus            → la collection entière (comportement par défaut)
GET /api/gpus?limit=50   → les 50 premières
GET /api/gpus?limit=50&page=2
```

La réponse reste un tableau dans les deux cas — le frontend charge chaque
catalogue d'un bloc pour sa recherche instantanée, et changer cette forme le
casserait. Quand la pagination est demandée, le total voyage dans l'en-tête
`X-Total-Count`. `limit` est plafonnée à 200 : sans plafond, `?limit=100000`
coûterait aussi cher que l'absence de pagination.

## Endpoints protégés

`POST`, `PUT` et `DELETE` sur les quatre collections exigent l'en-tête
`Authorization: Bearer <jeton>` obtenu via `POST /api/auth/login`.

## Scripts

```bash
npm run import   # importe/valide un lot dans le catalogue
npm run purge    # purge une collection (sauvegarde préalable dans backup/)
```
