import React from 'react';
import { Link } from 'react-router-dom';
import { utiliseIconesPersonnalisees, iconesFournies } from '../utils/iconFiles';

/*
 * Auteurs des icônes déposées dans `assets/icons/`.
 *
 * La licence gratuite de Flaticon impose une mention visible dans le produit.
 * Renseigner le nom indiqué sur la page de téléchargement, par fichier :
 *   { fichier: 'gpu.svg', auteur: 'Freepik', source: 'Flaticon' }
 *
 * Tant que la liste est vide alors que des fichiers sont présents, le pied de
 * page affiche un avertissement plutôt qu'une mention incomplète : une
 * attribution fausse ne vaut pas mieux qu'une attribution absente.
 */
const ATTRIBUTIONS = [
  {
    auteur: 'bqlqn',
    url: 'https://www.flaticon.com/authors/bqlqn',
    source: 'Flaticon',
    sourceUrl: 'https://www.flaticon.com/',
  },
];

const LINKS = [
  { to: '/telephones', label: 'Téléphones' },
  { to: '/laptops', label: 'Ordinateurs portables' },
  { to: '/cpus', label: 'Processeurs' },
  { to: '/gpus', label: 'Cartes graphiques' },
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
          Scores calculés depuis Geekbench 6 et 3DMark · © {new Date().getFullYear()}
        </span>

        {utiliseIconesPersonnalisees && (
          <span className="nr-text-gray-small" style={{ flex: '1 1 100%' }}>
            {ATTRIBUTIONS.length > 0 ? (
              <>
                Remerciements a : {' '}
                {ATTRIBUTIONS.map((a, i) => (
                  <React.Fragment key={a.auteur}>
                    {i > 0 && ', '}
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'inherit', textDecoration: 'underline' }}
                    >
                      {a.auteur}
                    </a>
                    {/* Certaines banques signent de leur propre nom : « Icons8
                        sur Icons8 » ne veut rien dire, on n'affiche alors que
                        le lien unique. */}
                    {a.auteur !== a.source && (
                      <>
                        {' sur '}
                        <a
                          href={a.sourceUrl || a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'inherit', textDecoration: 'underline' }}
                        >
                          {a.source}
                        </a>
                      </>
                    )}
                  </React.Fragment>
                ))}
              </>
            ) : (
              <strong>
                Attribution à renseigner pour {iconesFournies.length} icône
                {iconesFournies.length > 1 ? 's' : ''} ({iconesFournies.join(', ')})
                {' '}— voir src/assets/icons/LISEZ-MOI.md
              </strong>
            )}
          </span>
        )}
      </div>
    </footer>
  );
}

export default Footer;
