import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { login } from '../api';
import { usePageTitle } from '../hooks/usePageTitle';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  usePageTitle('Administration');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Connexion réussie.');
      navigate('/admin');
    } catch (err) {
      toast.error(err.message || 'Identifiants invalides.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nr-main" style={{ maxWidth: 420 }}>
      <section className="nr-card">
        <div className="nr-card-head">
          <h1 className="nr-title-h2">Administration</h1>
          <p className="nr-text-gray-small">Réservé à la gestion du catalogue.</p>
        </div>

        <form className="nr-card-body" onSubmit={handleLogin}>
          <label className="nr-label" htmlFor="login-user">Nom d’utilisateur</label>
          <input
            id="login-user"
            className="nr-input"
            style={{ width: '100%', marginBottom: 12 }}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />

          <label className="nr-label" htmlFor="login-pass">Mot de passe</label>
          <input
            id="login-pass"
            className="nr-input"
            style={{ width: '100%', marginBottom: 16 }}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          <button className="nr-btn" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </section>
    </div>
  );
}

export default LoginPage;
