import React, { lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import App from './App.jsx';
import HomePage from './pages/Homepage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RouteError from './pages/RouteError.jsx';

import './index.css';

/*
 * Chargement differe des ecrans.
 *
 * L'accueil reste importe en dur : c'est la page d'arrivee, la charger dans un
 * second temps ferait clignoter un indicateur avant le premier contenu. Tout
 * le reste part dans son propre fragment, telecharge au moment ou la route est
 * visitee. Sans cela, un visiteur de l'accueil recevait aussi le comparateur,
 * le radar SVG et le panneau d'administration — soit un fragment unique de
 * pres de 400 ko, alors que l'API met deja plusieurs secondes a se reveiller.
 *
 * `App` monte un <Suspense> autour de son <Outlet /> : c'est lui qui affiche
 * l'attente pendant le telechargement d'un fragment.
 */
const ComparePage = lazy(() => import('./pages/ComparePage.jsx'));
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));

const CpuPage = lazy(() => import('./pages/CpuPage.jsx'));
const GpuPage = lazy(() => import('./pages/GpuPage.jsx'));
const LaptopPage = lazy(() => import('./pages/LaptopPage.jsx'));
const TelephonePage = lazy(() => import('./pages/TelephonePage.jsx'));

const CpuDetailPage = lazy(() => import('./pages/CpuDetailPage.jsx'));
const GpuDetailPage = lazy(() => import('./pages/GpuDetailPage.jsx'));
const LaptopDetailPage = lazy(() => import('./pages/LaptopDetailPage.jsx'));
const TelephoneDetailPage = lazy(() => import('./pages/TelephoneDetailPage.jsx'));

/*
 * Les quatre categories ont la meme paire de routes : le classement et la
 * fiche. Les decrire une fois evite qu'un ajout de categorie oublie l'une des
 * deux, ce que la liste ecrite a la main rendait facile.
 */
const CATEGORIES = [
  { classement: 'cpus', fiche: 'cpu', Classement: CpuPage, Fiche: CpuDetailPage },
  { classement: 'gpus', fiche: 'gpu', Classement: GpuPage, Fiche: GpuDetailPage },
  { classement: 'laptops', fiche: 'laptop', Classement: LaptopPage, Fiche: LaptopDetailPage },
  {
    classement: 'telephones',
    fiche: 'telephone',
    Classement: TelephonePage,
    Fiche: TelephoneDetailPage,
  },
];

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    // Toute exception levee pendant le rendu d'un ecran enfant remonte ici,
    // au lieu de demonter l'arbre et de laisser une page blanche.
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },

      ...CATEGORIES.flatMap(categorie => {
        const { classement, fiche, Classement, Fiche } = categorie;
        return [
          { path: classement, element: <Classement /> },
          { path: `${fiche}/:id`, element: <Fiche /> },
        ];
      }),

      { path: 'compare', element: <ComparePage /> },
      { path: 'login', element: <LoginPage /> },
      {
        path: 'admin',
        element: (
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        ),
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
