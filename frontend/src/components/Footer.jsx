import React from 'react';
import { Link } from 'react-router-dom';

const LINKS = [
  { to: '/cpus', label: 'Processeurs' },
  { to: '/gpus', label: 'Cartes graphiques' },
  { to: '/laptops', label: 'Ordinateurs portables' },
  { to: '/telephones', label: 'Téléphones' },
];

function Footer() {
  return (
    <footer
      style={{
        marginTop: 24,
        background: 'var(--nr-card)',
        borderTop: '1px solid var(--nr-line-strong)',
      }}
    >
      <div
        className="nr-main-wide"
        style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}
      >
        <span style={{ fontWeight: 700 }}>CompareTech</span>

        <nav style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {LINKS.map(link => (
            <Link key={link.to} className="nr-text-small" to={link.to}>{link.label}</Link>
          ))}
          <Link className="nr-text-small" to="/login">Administration</Link>
        </nav>

        <span className="nr-text-gray-small" style={{ marginLeft: 'auto' }}>
          Scores calculés depuis Geekbench 6, 3DMark et AnTuTu · © {new Date().getFullYear()}
        </span>
      </div>
    </footer>
  );
}

export default Footer;
