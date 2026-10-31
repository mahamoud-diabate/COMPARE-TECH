import React from 'react';
import { Link } from 'react-router-dom';
import { ScoreChip } from '../Score';
import { scoreGrade, getProductScore } from '../../utils/scores';
import {
  classer,
  texteRang,
  preparerAxeNotes,
  placerEtiquettes,
  indexMeneurs,
  SERIES,
} from '../../utils/marche';
import { formatValue } from '../../utils/specs';
import { cheminProduit } from '../../utils/liens';
import { Glyphe, RepereSvg } from './Repere';

const LARGEUR = 760;
const X0 = 20;
const X1 = 740;
const Y_AXE = 92;

/**
 * Axe des notes de 0 à 100 : un point gris par produit de la catégorie, les
 * produits comparés repérés au-dessus. On voit d'un coup d'œil si l'écart
 * entre eux est grand à l'échelle du marché, ou anecdotique.
 */
function AxeNotes({ notes, produits }) {
  const axe = preparerAxeNotes(notes);
  if (!axe) return null;

  const x = t => X0 + t * (X1 - X0);
  const comparés = produits.filter(p => p.note > 0);

  const etiquettes = comparés.map(p => {
    const texte = `${p.court} · ${p.note}`;
    return { texte, largeur: Math.max(84, texte.length * 6.8 + 24), cible: x(p.note / 100) };
  });
  const centres = placerEtiquettes(etiquettes, 6, LARGEUR - 6);
  const xs = comparés.map(p => x(p.note / 100));

  const pasColonne = (X1 - X0) / (axe.colonnes.length || 1);
  const plusHaute = Math.max(...axe.colonnes, 1);

  return (
    <svg
      className="ct-marche-axe"
      viewBox={`0 0 ${LARGEUR} 124`}
      role="img"
      aria-label="Notes de tous les produits de la catégorie, de 0 à 100, et position des produits comparés"
    >
      {[0, 25, 50, 75, 100].map(v => (
        <g key={v}>
          <line x1={x(v / 100)} y1="38" x2={x(v / 100)} y2={Y_AXE + 4} stroke="var(--ct-line)" />
          <text
            x={x(v / 100)}
            y="114"
            textAnchor={v === 0 ? 'start' : v === 100 ? 'end' : 'middle'}
            className="ct-marche-axe-graduation"
          >
            {v}
          </text>
        </g>
      ))}

      {axe.mode === 'points'
        ? axe.points.map((p, i) => (
            <circle
              key={i}
              cx={x(p.t)}
              cy={Math.max(44, Y_AXE - 6 - p.niveau * 7)}
              r="3.2"
              fill="var(--ct-line-strong)"
            />
          ))
        : axe.colonnes.map((n, i) =>
            n ? (
              <rect
                key={i}
                x={X0 + i * pasColonne + 0.6}
                y={Y_AXE - Math.max(1.5, (n / plusHaute) * 44)}
                width={pasColonne - 1.2}
                height={Math.max(1.5, (n / plusHaute) * 44)}
                rx="1"
                fill="var(--ct-line-strong)"
              />
            ) : null
          )}

      <line
        x1={X0}
        y1={Y_AXE}
        x2={X1}
        y2={Y_AXE}
        stroke="var(--ct-line-strong)"
        strokeWidth="1.5"
      />
      <line
        x1={x(axe.milieu / 100)}
        y1="36"
        x2={x(axe.milieu / 100)}
        y2={Y_AXE + 5}
        stroke="var(--ct-muted)"
        strokeWidth="1.3"
        strokeDasharray="3,3"
      />
      <text x={x(axe.milieu / 100)} y="105" textAnchor="middle" className="ct-marche-axe-milieu">
        milieu du catalogue : {Math.round(axe.milieu)}
      </text>

      {xs.length >= 2 && Math.max(...xs) - Math.min(...xs) > 1 && (
        <line
          x1={Math.min(...xs)}
          y1={Y_AXE}
          x2={Math.max(...xs)}
          y2={Y_AXE}
          stroke="var(--ct-accent)"
          strokeWidth="3.5"
          strokeOpacity="0.42"
        />
      )}

      {comparés.map((p, i) => {
        const e = etiquettes[i];
        const centre = centres[i];
        const gauche = centre - e.largeur / 2;
        const couleur = SERIES[p.index % 3];
        return (
          <g key={p.id}>
            <path
              d={`M ${centre} 28 L ${e.cible} 38 L ${e.cible} ${Y_AXE}`}
              fill="none"
              stroke={couleur}
              strokeWidth="1.4"
            />
            <rect
              x={gauche}
              y="6"
              width={e.largeur}
              height="22"
              rx="3"
              fill="var(--ct-card-alt)"
              stroke={couleur}
              strokeWidth="1.3"
            />
            <RepereSvg x={gauche + 11} y={17} index={p.index} r={3.8} />
            <text x={gauche + 20} y="21" className="ct-marche-axe-etiquette">
              {e.texte}
            </text>
          </g>
        );
      })}
      {comparés.map(p => (
        <RepereSvg key={p.id} x={x(p.note / 100)} y={Y_AXE} index={p.index} r={5.4} />
      ))}
    </svg>
  );
}

/**
 * Bloc d'ouverture du comparatif : qui gagne, où chacun se situe dans le
 * marché, et le classement complet à déplier.
 *
 * Le périmètre de comparaison est nommé une seule fois, en tête : alterner
 * « groupe », « catalogue » et « pairs » faisait douter le lecteur de ce à
 * quoi chaque chiffre se rapportait.
 */
function EnteteMarche({ produits, catalogue, productType, type, libelleCategorie, avantages }) {
  const notesCatalogue = catalogue.map(p => getProductScore(p, productType)).filter(n => n > 0);

  const lignes = produits.map((produit, index) => {
    const note = getProductScore(produit, productType);
    return {
      id: produit._id,
      produit,
      index,
      note,
      court: produit.name.replace(
        /^(AMD|Intel|NVIDIA|Nvidia|Apple|Samsung)\s+(Core\s+|Ryzen\s+\d\s+)?/,
        ''
      ),
      classement: classer(notesCatalogue, note),
    };
  });

  const meilleure = Math.max(...lignes.map(l => l.note));
  // Zone d'égalité : à moins de 3 % de la meilleure note, un produit est à
  // égalité de fait. Pas de badge « Meilleure note » pour un écart de 2 points.
  const meneurs = indexMeneurs(lignes.map(l => l.note)).map(i => lignes[i]);
  const effectif = Math.max(notesCatalogue.length, 1);

  let titre = null;
  if (meilleure > 0 && lignes.length > 1) {
    const memeNote = meneurs.every(l => l.note === meilleure);
    titre =
      meneurs.length === 1
        ? `${meneurs[0].produit.name} obtient la meilleure note globale (${meilleure}/100).`
        : memeNote
          ? `${meneurs.map(l => l.produit.name).join(' et ')} obtiennent la même note globale (${meilleure}/100).`
          : `${meneurs.map(l => `${l.produit.name} (${l.note})`).join(' et ')} obtiennent des notes équivalentes : moins de 3 % d’écart.`;
  }

  // Classement complet : la liste réelle, triée, les produits comparés
  // surlignés. Le visiteur voit les noms des voisins, pas seulement un rang.
  const classementComplet = catalogue
    .map(p => ({ p, note: getProductScore(p, productType) }))
    .filter(l => l.note > 0)
    .sort((a, b) => b.note - a.note);

  return (
    <section className="ct-card ct-marche-carte">
      <div className="ct-marche-tete">
        <span className="ct-marche-perimetre">
          Classés parmi :{' '}
          <strong>
            {effectif} {libelleCategorie}
          </strong>
        </span>
        <h1 className="ct-title-h1">{produits.map(p => p.name).join(' vs ')}</h1>
      </div>

      <div className="ct-marche-fiches" style={{ '--ct-nb-produits': produits.length }}>
        {lignes.map(l => {
          const enTete = meneurs.length === 1 && meneurs[0] === l && lignes.length > 1;
          return (
            <div key={l.id} className={`ct-marche-fiche${enTete ? ' is-lead' : ''}`}>
              <div className="ct-marche-fiche-haut">
                <div>
                  <div className="ct-marche-fiche-marque">
                    <Glyphe index={l.index} />
                    <span>{l.produit.brand}</span>
                    {enTete && <span className="ct-marche-badge">Meilleure note</span>}
                  </div>
                  <Link className="ct-marche-fiche-nom" to={cheminProduit(type, l.produit)}>
                    {l.produit.name}
                  </Link>
                </div>
                <ScoreChip
                  score={l.note}
                  label={l.note > 0 ? `/100 · ${scoreGrade(l.note).letter}` : 'non noté'}
                />
              </div>
              <div className="ct-marche-fiche-bas">
                {l.classement ? (
                  <span>
                    <strong>{texteRang(l.classement)}</strong>
                    {l.classement.mot ? ` · ${l.classement.mot}` : ''}
                  </span>
                ) : (
                  <span>Note non calculable : mesures incomplètes</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {titre && (
        <div className="ct-marche-synthese">
          <div className="ct-marche-synthese-titre">{titre}</div>
          <div className="ct-marche-synthese-colonnes">
            {lignes.map((l, i) => (
              <div key={l.id}>
                <div className="ct-marche-synthese-nom">
                  <Glyphe index={l.index} /> Avantages {l.court}
                </div>
                {avantages[i]?.length ? (
                  <ul className="ct-marche-synthese-liste">
                    {avantages[i].slice(0, 3).map((texte, k) => (
                      <li key={k}>{texte}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="ct-marche-synthese-vide">
                    Aucun des critères mesurés ne le met en avant.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {notesCatalogue.length > 1 && (
        <div className="ct-marche-global">
          <div className="ct-marche-global-tete">
            <span>
              <strong>Note globale sur 100</strong> · plus à droite = meilleur
            </span>
            <span>
              {notesCatalogue.length > 40
                ? 'Barres grises = nombre de produits par note'
                : 'Chaque point gris = un autre produit du site'}
            </span>
          </div>
          <AxeNotes notes={notesCatalogue} produits={lignes} />

          <details className="ct-marche-classement">
            <summary>
              Voir le classement des {classementComplet.length} {libelleCategorie}
            </summary>
            <ol>
              {classementComplet.map(({ p, note }) => {
                const index = produits.findIndex(c => c._id === p._id);
                const rang = classer(notesCatalogue, note);
                return (
                  <li key={p._id} className={index >= 0 ? 'is-compare' : ''}>
                    <span className="ct-num">{rang.rang}</span>
                    <span className="ct-marche-classement-nom">
                      {index >= 0 && <Glyphe index={index} />}
                      <Link to={cheminProduit(type, p)}>{p.name}</Link>
                    </span>
                    <span className="ct-num" style={{ color: scoreGrade(note).variable }}>
                      {formatValue(note)}
                    </span>
                  </li>
                );
              })}
            </ol>
          </details>
        </div>
      )}
    </section>
  );
}

export default EnteteMarche;
