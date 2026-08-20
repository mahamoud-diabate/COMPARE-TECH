import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--nr-bg)' }}>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--nr-card)',
            color: 'var(--nr-text)',
            border: '1px solid var(--nr-line-strong)',
            borderRadius: '3px',
            fontSize: '13px',
          },
        }}
      />
      <Header toggleTheme={toggleTheme} theme={theme} />
      <div style={{ flex: 1 }}>
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

export default App;
