import React, { useState, useEffect, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';
import { Toaster } from 'react-hot-toast';

function App() {
  // Clair par défaut : le comparateur est fait pour être lu longtemps, avec
  // beaucoup de tableaux et de chiffres, et le fond clair y tient mieux le
  // contraste. Le choix de l'utilisateur reste prioritaire une fois posé.
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: 'var(--ct-bg)',
      }}
    >
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--ct-card)',
            color: 'var(--ct-text)',
            border: '1px solid var(--ct-line-strong)',
            borderRadius: '3px',
            fontSize: '13px',
          },
        }}
      />
      <Header toggleTheme={toggleTheme} theme={theme} />
      <div style={{ flex: 1 }}>
        {/* Les écrans sont chargés à la demande (voir main.jsx). L'attente est
            affichée ici, une fois pour toutes les routes : l'en-tête et le
            pied de page restent en place pendant le téléchargement, la page
            ne se vide pas. */}
        <Suspense
          fallback={
            <div className="ct-main-wide">
              <LoadingSpinner message="Chargement de la page…" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </div>
      <Footer />
    </div>
  );
}

export default App;
