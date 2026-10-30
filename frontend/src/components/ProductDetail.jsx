import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ImageOff, ExternalLink } from 'lucide-react';

import CompareWith from './CompareWith';
import SimilarProducts from './SimilarProducts';
import { useCollection } from '../hooks/useCollection';
import { getProductScore } from '../utils/scores';
import { usePageTitle } from '../hooks/usePageTitle';
import { genererUsages, genererSpecsSynthese, genererDatasheet } from '../utils/ficheProduit';

const META = {
  cpu: { label: 'Processeurs', path: '/cpus', collection: 'cpus' },
  gpu: { label: 'Cartes graphiques', path: '/gpus', collection: 'gpus' },
  laptop: { label: 'Ordinateurs portables', path: '/laptops', collection: 'laptops' },
  telephone: { label: 'Téléphones', path: '/telephones', collection: 'telephones' },
};

/**
 * Fiche produit (Refonte unifiée Piste A & Piste C).
 *
 * Étage 1 (Piste C) : Usages concrets & impact pratique avec sélecteur interactif d'onglets.
 * Étage 2 (Piste A) : Datasheet asymétrique exhaustive, chaque valeur avec sa source, et volet sticky.
 *
 * Exclut tout classement relatif ou jauge invasive pour se concentrer sur les spécifications.
 */
function ProductDetail({ product, type }) {
  const [ongletActif, setOngletActif] = useState(0);
  const meta = META[type] || META.cpu;
  const { data } = useCollection(meta.collection);

  const others = useMemo(() => {
    if (!product) return [];
    return data
      .filter(item => item._id !== product._id)
      .sort((a, b) => getProductScore(b, type) - getProductScore(a, type));
  }, [data, product, type]);

  const usages = useMemo(() => genererUsages(product, type), [product, type]);
  const synthese = useMemo(() => genererSpecsSynthese(product, type), [product, type]);
  const datasheet = useMemo(() => genererDatasheet(product, type), [product, type]);

  usePageTitle(
    product && `${product.name} : fiche technique et spécifications`,
    product &&
      `Caractéristiques détaillées, usages concrets et fiche technique de ${product.name} (${product.brand}).`
  );

  if (!product) return null;

  const usageCourant = usages[ongletActif] || usages[0];

  return (
    <div className="ct-main">
      {/* Fil d'Ariane */}
      <nav className="ct-breadcrumb" aria-label="Fil d'Ariane">
        <span>
          <Link to="/">Accueil</Link>
        </span>
        <span>
          <Link to={meta.path}>{meta.label}</Link>
        </span>
        <span aria-current="page">{product.name}</span>
      </nav>

      {/* HERO DU PRODUIT */}
      <section className="ct-card ct-fiche-hero">
        <div className="ct-fiche-thumb">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} />
          ) : (
            <ImageOff size={40} strokeWidth={1.5} color="var(--ct-muted)" />
          )}
        </div>

        <div className="ct-fiche-meta">
          <span className="ct-fiche-tag">
            {meta.label} · {product.brand}
          </span>
          <h1 className="ct-title-h1" style={{ margin: 0 }}>
            {product.name}
          </h1>
          <div className="ct-fiche-sub">
            Fiche technique détaillée · chaque valeur avec sa source
          </div>
        </div>

        <div className="ct-fiche-actions">
          <div className="ct-fiche-score-badge">
            <span>Données sourcées</span>
            <strong>{new Date().getFullYear()}</strong>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href="#datasheet" className="ct-btn ct-btn-ghost">
              Spécifications complètes ↓
            </a>
            {product.buyUrl && /^https?:\/\//i.test(product.buyUrl) && (
              <a className="ct-btn" href={product.buyUrl} target="_blank" rel="noopener noreferrer">
                Voir l’offre <ExternalLink size={13} style={{ marginLeft: 4 }} />
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ÉTAGE 1 : USAGES CONCRETS & IMPACT PRATIQUE (SWITCH INTERACTIF) */}
      {usages.length > 0 && (
        <section className="ct-card" style={{ marginBottom: 20 }}>
          <div className="ct-fiche-usage-header">
            <div>
              <div className="ct-fiche-usage-title">
                Étage 1 · Impact pratique & Usages concrets
              </div>
              <div className="ct-fiche-usage-subtitle">
                Ce que les caractéristiques matérielles changent concrètement dans vos logiciels et
                jeux
              </div>
            </div>
            <span style={{ fontSize: 12, color: 'var(--ct-muted)' }}>
              Sélectionnez un profil d’usage :
            </span>
          </div>

          <div className="ct-fiche-usage-wrap">
            <div className="ct-fiche-usage-tabs" role="tablist" aria-label="Profils d'usage">
              {usages.map((u, idx) => (
                <button
                  key={u.id}
                  type="button"
                  role="tab"
                  className="ct-fiche-usage-tab-btn"
                  aria-selected={ongletActif === idx}
                  onClick={() => setOngletActif(idx)}
                >
                  {u.titre}
                </button>
              ))}
            </div>

            {usageCourant && (
              <div className="ct-fiche-usage-detail-box" role="tabpanel">
                <div className="ct-fiche-usage-spec-side">
                  <span className="ct-fiche-usage-spec-tag">{usageCourant.specTitre}</span>
                  <div className="ct-fiche-usage-spec-value">{usageCourant.specVal}</div>
                  <div className="ct-fiche-usage-spec-summary">{usageCourant.resume}</div>
                </div>

                <div className="ct-fiche-usage-impact-side">
                  <h4>{usageCourant.titre}</h4>
                  <p dangerouslySetInnerHTML={{ __html: usageCourant.impact }} />
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ÉTAGE 2 : DATASHEET ASYMÉTRIQUE & VOLET LATÉRAL FIXE */}
      <div className="ct-fiche-datasheet-layout" id="datasheet">
        {/* Colonne gauche : toutes les caractéristiques par groupe */}
        <div className="ct-fiche-spec-groups">
          {datasheet.map((groupe, gIdx) => (
            <section key={gIdx} className="ct-fiche-spec-group">
              <div className="ct-fiche-spec-group-head">{groupe.titre}</div>
              <div>
                {groupe.lignes.map(ligne => (
                  <div key={ligne.cle} className="ct-fiche-spec-row">
                    <div className="ct-fiche-spec-meta">
                      <b>{ligne.nom}</b>
                      <small>{ligne.aide}</small>
                    </div>
                    <div className="ct-fiche-spec-val">{ligne.val}</div>
                    <div className="ct-fiche-spec-src">
                      {ligne.source?.url ? (
                        <a
                          href={ligne.source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={
                            ligne.source.extrait
                              ? `Extrait relevé : « ${ligne.source.extrait} »`
                              : undefined
                          }
                        >
                          {ligne.source.site}
                          {ligne.source.origine ? ` · ${ligne.source.origine}` : ''}
                        </a>
                      ) : ligne.sourceAttendue ? (
                        <span>Source non renseignée</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Colonne droite : volet sticky synthèse & raccourci duel */}
        <aside className="ct-fiche-sidebar-sticky">
          <div className="ct-fiche-side-card">
            <div className="ct-fiche-side-title">Repères essentiels</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {synthese.map((item, sIdx) => (
                <div key={sIdx} className="ct-fiche-side-metric">
                  <span className="ct-fiche-side-metric-label">{item.label}</span>
                  <span className="ct-fiche-side-metric-val">{item.val}</span>
                </div>
              ))}
            </div>
            <p className="ct-fiche-side-info">
              Chaque valeur renvoie à la page d’où elle a été relevée. Survolez une source pour lire
              l’extrait.
            </p>
            <a href="#" className="ct-fiche-side-link">
              Haut de page ↑
            </a>
          </div>

          <div className="ct-fiche-side-card" style={{ background: 'var(--ct-card-alt)' }}>
            <div className="ct-fiche-side-title">Comparer ce modèle</div>
            <p className="ct-fiche-side-info">
              Opposez ce modèle à un rival direct pour révéler les différences de spécifications et
              d’usages.
            </p>
            <Link
              to={`/compare?type=${type}&p1=${product._id}${others[0] ? `&p2=${others[0]._id}` : ''}`}
              className="ct-btn ct-btn-primary"
              style={{ justifyContent: 'center', width: '100%' }}
            >
              Lancer un duel
            </Link>
          </div>
        </aside>
      </div>

      {/* COMPARER AVEC UN AUTRE MODÈLE */}
      {others.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <CompareWith product={product} type={type} others={others} />
        </div>
      )}

      {/* AUTRES MODÈLES DE LA GAMME */}
      {others.length > 0 && (
        <section className="ct-card" style={{ marginTop: 20 }}>
          <div className="ct-card-head">
            <h2 className="ct-title-h2">Autres modèles de la gamme</h2>
          </div>
          <div className="ct-card-body" style={{ paddingTop: 8 }}>
            <SimilarProducts products={others.slice(0, 4)} type={type} />
          </div>
        </section>
      )}
    </div>
  );
}

export default ProductDetail;
