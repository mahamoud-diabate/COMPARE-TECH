import React, { useState } from 'react';
import { toNumber, formatValue, winnerIndex } from '../../utils/specs';
import { criteresMarche, classer, texteRang, preparerPiste, SERIES } from '../../utils/marche';
import { Glyphe, RepereSvg } from './Repere';

const X0 = 10;
const X1 = 350;
const Y_AXE = 27;
const H_MAX = 20;

/**
 * Piste d'un critère : où se trouvent tous les produits de la catégorie
 * (gris), et où se placent ceux qu'on compare (repères couleur + forme).
 * Plus à droite = meilleur, même pour la consommation où l'axe est retourné.
 */
function Piste({ piste }) {
  const x = t => X0 + t * (X1 - X0);
  const pas = (X1 - X0) / 32;

  const marques = piste.marques.map((m, index) => (m ? { ...m, index } : null)).filter(Boolean);
  const xs = marques.map(m => x(m.t));

  return (
    <svg className="ct-marche-piste" viewBox="0 0 360 38" aria-hidden="true">
      {piste.mode === 'paliers' &&
        piste.elements.map((e, i) => {
          const h = Math.max(3, e.hauteur * H_MAX);
          return (
            <rect
              key={i}
              x={x(e.t) - 4}
              y={Y_AXE - h}
              width="8"
              height={h}
              rx="1"
              fill="var(--ct-line-strong)"
            />
          );
        })}
      {piste.mode === 'points' &&
        piste.elements.map((e, i) => (
          <circle
            key={i}
            cx={x(e.t)}
            cy={Math.max(4, Y_AXE - 4.5 - e.niveau * 5.2)}
            r="2.4"
            fill="var(--ct-line-strong)"
          />
        ))}
      {piste.mode === 'colonnes' &&
        piste.elements.map((e, i) =>
          e.effectif ? (
            <rect
              key={i}
              x={x(e.t) + 0.5}
              y={Y_AXE - Math.max(1.5, e.hauteur * H_MAX)}
              width={Math.max(1, pas - 1)}
              height={Math.max(1.5, e.hauteur * H_MAX)}
              rx="1"
              fill="var(--ct-line-strong)"
            />
          ) : null
        )}

      <line x1={X0} y1={Y_AXE} x2={X1} y2={Y_AXE} stroke="var(--ct-track)" strokeWidth="1.5" />
      <line
        x1={x(piste.milieu)}
        y1="5"
        x2={x(piste.milieu)}
        y2={Y_AXE + 5}
        stroke="var(--ct-muted)"
        strokeWidth="1.2"
        strokeDasharray="2.5,2.5"
      />
      {xs.length >= 2 && Math.max(...xs) - Math.min(...xs) > 1 && (
        <line
          x1={Math.min(...xs)}
          y1={Y_AXE}
          x2={Math.max(...xs)}
          y2={Y_AXE}
          stroke="var(--ct-accent)"
          strokeWidth="3"
          strokeOpacity="0.42"
        />
      )}
      {marques.map((m, k) => {
        // Deux produits à égalité : le second est remonté d'un cran au lieu
        // d'être caché sous le premier.
        const dy = -6 * marques.slice(0, k).filter(o => Math.abs(x(o.t) - x(m.t)) < 4).length;
        return (
          <g key={m.index}>
            <RepereSvg x={x(m.t)} y={Y_AXE + dy} index={m.index} r={4.8} />
            {m.horsDroite && (
              <text x={X1 + 3} y={Y_AXE + 3} fontSize="9" fill={SERIES[m.index % 3]}>
                ▸
              </text>
            )}
            {m.horsGauche && (
              <text x={X0 - 8} y={Y_AXE + 3} fontSize="9" fill={SERIES[m.index % 3]}>
                ◂
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Critère par critère : pour chaque mesure, la valeur, le gagnant et la place
 * de chaque produit parmi toute la catégorie. Chaque chiffre n'apparaît
 * qu'ici — plus de répétition entre « différences », « benchmarks » et
 * « tableau ».
 */
function CriteresMarche({ produits, catalogue, productType, libelleCategorie }) {
  const [ecartsSeulement, setEcartsSeulement] = useState(false);
  const criteres = criteresMarche(productType);

  const lignes = criteres.map(critere => {
    const valeurs = produits.map(p => toNumber(p[critere.key]));
    const presentes = valeurs.filter(v => v !== null && v > 0);
    const ecart =
      presentes.length >= 2
        ? (Math.max(...presentes) - Math.min(...presentes)) / Math.min(...presentes)
        : 0;
    return { critere, valeurs, presentes, ecart };
  });

  const nbEcarts = lignes.filter(l => l.ecart >= 0.1).length;
  const visibles = ecartsSeulement ? lignes.filter(l => l.ecart >= 0.1) : lignes;
  let groupePrecedent = null;

  return (
    <section className="ct-card ct-marche-carte" id="criteres">
      <div className="ct-marche-section-tete">
        <div>
          <h2 className="ct-title-h2">Critère par critère</h2>
          <p className="ct-text-gray-small">
            Pour chaque mesure : la valeur, le gagnant et la place parmi les {libelleCategorie} du
            site.
          </p>
        </div>
        <div className="ct-marche-filtres" role="group" aria-label="Filtrer les critères">
          <button
            type="button"
            className={`ct-chip${!ecartsSeulement ? ' is-on' : ''}`}
            aria-pressed={!ecartsSeulement}
            onClick={() => setEcartsSeulement(false)}
          >
            Tous ({lignes.length})
          </button>
          <button
            type="button"
            className={`ct-chip${ecartsSeulement ? ' is-on' : ''}`}
            aria-pressed={ecartsSeulement}
            onClick={() => setEcartsSeulement(true)}
          >
            Écarts ≥ 10 % ({nbEcarts})
          </button>
        </div>
      </div>

      <div className="ct-marche-legende">
        {produits.map((p, i) => (
          <span key={p._id} className="ct-marche-legende-item">
            <Glyphe index={i} /> <strong>{p.name}</strong>
          </span>
        ))}
        <span className="ct-marche-legende-item">
          <i className="ct-marche-legende-milieu" aria-hidden="true" /> Milieu (autant au-dessus
          qu’en dessous)
        </span>
        <span className="ct-marche-legende-sens">Plus à droite = meilleur</span>
      </div>

      <div className="ct-marche-lignes" style={{ '--ct-nb-produits': produits.length }}>
        {visibles.map(({ critere, valeurs, presentes }) => {
          const valeursCatalogue = catalogue.map(p => p[critere.key]);
          const piste = preparerPiste(valeursCatalogue, valeurs, critere.invert);
          // Une spec papier (fréquence, cœurs, threads) n'a jamais de gagnant.
          const gagnant = critere.departage
            ? winnerIndex(produits, critere.key, critere.invert)
            : -1;
          const enTeteGroupe = critere.groupe !== groupePrecedent;
          groupePrecedent = critere.groupe;

          return (
            <React.Fragment key={critere.key}>
              {enTeteGroupe && <div className="ct-marche-groupe">{critere.groupe}</div>}
              <div className="ct-marche-ligne">
                <div className="ct-marche-ligne-libelle">
                  <b>{critere.label}</b>
                  {critere.aide && <small>{critere.aide}</small>}
                </div>

                <div className="ct-marche-ligne-piste">
                  {piste && presentes.length > 0 ? (
                    <>
                      <Piste piste={piste} />
                      <div className="ct-marche-ligne-bornes ct-num">
                        <span>
                          {formatValue(Number(piste.bornes.gauche.toFixed(1)), critere.unit)}
                        </span>
                        <span>
                          {!critere.departage
                            ? 'position dans le catalogue, sans valeur de jugement'
                            : critere.invert
                              ? 'plus c’est bas, mieux c’est'
                              : 'plus c’est haut, mieux c’est'}
                        </span>
                        <span>
                          {formatValue(Number(piste.bornes.droite.toFixed(1)), critere.unit)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="ct-marche-ligne-vide">Pas encore relevé pour ces produits</div>
                  )}
                </div>

                {produits.map((produit, i) => {
                  const v = valeurs[i];
                  const absent = v === null || v <= 0;
                  const classement = absent ? null : classer(valeursCatalogue, v, critere.invert);
                  const autres = presentes.filter((_, k) => k !== presentes.indexOf(v));
                  let gain = null;
                  if (i === gagnant && autres.length) {
                    const reference = critere.invert ? Math.min(...autres) : Math.max(...autres);
                    const pct = critere.invert
                      ? Math.round(((reference - v) / reference) * 100)
                      : Math.round(((v - reference) / reference) * 100);
                    if (pct >= 1) gain = `${critere.invert ? '−' : '+'}${pct}\u00a0%`;
                  }
                  return (
                    <div
                      key={produit._id}
                      className={`ct-marche-cellule${i === gagnant ? ' is-win' : ''}${absent ? ' is-absent' : ''}`}
                    >
                      <div className="ct-marche-cellule-nom">
                        <Glyphe index={i} /> {produit.name}
                      </div>
                      <div className="ct-marche-cellule-valeur">
                        <span className="ct-num">
                          {absent ? '—' : formatValue(v, critere.unit)}
                        </span>
                        {gain && <span className="ct-marche-cellule-gain ct-num">{gain}</span>}
                      </div>
                      <span className="ct-marche-cellule-rang">
                        {absent
                          ? 'non relevé'
                          : `${texteRang(classement)}${classement.mot ? ` · ${classement.mot}` : ''}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <div className="ct-marche-pied">
        <p>
          <strong>Comment lire :</strong> sur chaque ligne, plus un repère est à droite, meilleur il
          est. Pour le TDP, le plus bas est donc à droite. Pour les fréquences, cœurs et threads, la
          piste situe seulement la valeur dans le catalogue.
        </p>
        <p>
          <strong>Égalités :</strong> deux produits à valeur égale partagent le même rang (« ex æquo
          »). Sous 3 % d’écart, aucun gagnant n’est désigné : la différence ne se ressent pas.
        </p>
        <p>
          <strong>Fréquences, cœurs et threads :</strong> affichés et situés, jamais départagés. Ils
          ne disent pas lequel calcule le plus vite ; les benchmarks, si.
        </p>
      </div>
    </section>
  );
}

export default CriteresMarche;
