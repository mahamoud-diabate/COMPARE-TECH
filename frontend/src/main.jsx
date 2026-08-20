import React from 'react'
import ReactDOM from 'react-dom/client';
import {createBrowserRouter, RouterProvider} from 'react-router-dom';
import App from './App.jsx';
import HomePage from './pages/Homepage.jsx';
import CpuPage from './pages/CpuPage.jsx';
import CpuDetailPage from './pages/CpuDetailPage.jsx';
import ComparePage from './pages/ComparePage.jsx';
import GpuPage from './pages/GpuPage.jsx';
import GpuDetailPage from'./pages/GpuDetailPage.jsx';
import LaptopPage from'./pages/LaptopPage.jsx';
import LaptopDetailPage from'./pages/LaptopDetailPage.jsx';
import TelephonePage from './pages/TelephonePage.jsx';
import TelephoneDetailPage from './pages/TelephoneDetailPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import RouteError from './pages/RouteError.jsx';


import'./index.css';

const router= createBrowserRouter([
  {
    path: "/",
    element:<App/>,
    // Toute exception levee pendant le rendu d'un ecran enfant remonte ici,
    // au lieu de demonter l'arbre et de laisser une page blanche.
    errorElement:<RouteError/>,
    children:[

     { path: "/login", element: <LoginPage /> },
      { 
        path: "/admin", 
        element: (
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        ) 
      },
      
      {
        path:"/",
        element:<HomePage/>,
      },
      {
        path: "/cpus",
        element:<CpuPage/>,

      },
      {path:"/gpus",
        element:<GpuPage/>,
      },
      {path:"/laptops",
        element:<LaptopPage/>,
      },
       {
        path:"/telephones",
        element:<TelephonePage/>,
      },
      
      {
        path:"/cpu/:id",
        element:<CpuDetailPage/>,
      },
      {
        path:"/gpu/:id",
        element:<GpuDetailPage/>,
      },
      {path:"/laptop/:id",
        element:<LaptopDetailPage/>,
      },
      { path: "/telephone/:id", 
        element: <TelephoneDetailPage /> 
      }, 
      
      {
        path:'/compare',
        element:<ComparePage/>,
      },

      { path: "*", element: <NotFoundPage /> }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router}/>
  </React.StrictMode>
);
