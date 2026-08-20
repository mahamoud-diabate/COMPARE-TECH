import React, { useId } from 'react';
import { buildCategoryScores } from '../utils/radarAxes';

// Repère du tracé, en unités du viewBox. La marge autour du cercle laisse la
// place aux libellés d'axes, qui débordent du rayon.
const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = 104;
const LABEL_GAP = 20;
const RINGS = [25, 50, 75, 100];

// Une couleur par produit comparé. Trois suffisent : la sélection est plafonnée
// à trois produits (voir MAX_COMPARE_ITEMS). La première suit l'accent du
// thème, les deux autres sont assez distinctes pour rester lisibles en clair
// comme en sombre. C'est la seule entorse à la règle « couleur = donnée » :
// sans teinte propre, deux polygones superposés sont indissociables.
const SERIES = ['a', 'b', 'c'];

// Angle de l'axe i, en radians, premier axe à la verticale (12 h).
const angleOf = (index, total) => (Math.PI * 2 * index) / total - Math.PI / 2;

const pointAt = (index, total, value) => {
  const angle = angleOf(index, total);
  const distance = (Math.max(0, Math.min(100, value)) / 100) * RADIUS;
  return [CENTER + Math.cos(angle) * distance, CENTER + Math.sin(angle) * distance];
};

const polygon = (total, values) =>
  values.map((value, i) => pointAt(i, total, value).join(',')).join(' ');

const ringPolygon = (total, percent) =>
  Array.from({ length: total }, (_, i) => pointAt(i, total, percent).join(',')).join(' ');

// Ancrage du libellé selon sa position sur le cercle : un texte à droite doit
// partir vers la droite, un texte à gauche vers la gauche, sinon il chevauche
// le graphique.
const anchorFor = (x) => {
  if (x > CENTER + 4) return 'start';
  if (x < CENTER - 4) return 'end';
  return 'middle';
};

/**
 * Radar comparatif, en SVG.
 *
 * Écrit à la main plutôt que via une bibliothèque de graphiques : recharts
 * pesait 319 Ko pour ce seul écran, soit plus que tout le reste de
 * l'application réunie. Le tracé suit le thème sans passe-plat, puisqu'il
 * s'habille des mêmes variables CSS que le reste du site.
 *
 * Trace autant de séries qu'on lui passe de produits — la version précédente
 * n'en acceptait que deux et laissait tomber le troisième en silence, alors
 * que la sélection en autorise trois.
 *
 * Les axes et leur normalisation viennent de `buildCategoryScores`, la même
 * fonction que le bloc « Évaluation » : les deux affichages ne peuvent pas
 * diverger. Seule différence de rendu, une donnée absente est tracée à 0 —
 * il faut bien fermer le polygone — alors que le tableau des notes affiche
 * « n/d ».
 */
function TechRadar({ products = [], productType }) {
  const list = products.filter(Boolean);
  const axes = buildCategoryScores(list, productType);
  const titleId = useId();

  if (axes.length < 3) {
    return (
      <div className="nr-empty">
        Les caractéristiques disponibles ne permettent pas de tracer un radar
        (trois axes minimum).
      </div>
    );
  }

  const total = axes.length;

  return (
    <figure style={{ margin: 0 }}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width="100%"
        height="100%"
        role="img"
        aria-labelledby={titleId}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <title id={titleId}>
          Profil comparé de {list.length} produits sur {total} critères, chacun ramené sur 100.
        </title>

        {RINGS.map(percent => (
          <polygon key={percent} className="nr-radar-grid" points={ringPolygon(total, percent)} />
        ))}

        {axes.map((axis, i) => {
          const [x, y] = pointAt(i, total, 100);
          return <line key={axis.label} className="nr-radar-axis" x1={CENTER} y1={CENTER} x2={x} y2={y} />;
        })}

        {list.map((product, seriesIndex) => (
          <polygon
            key={`shape-${product._id || seriesIndex}`}
            className={`nr-radar-shape is-${SERIES[seriesIndex] || 'a'}`}
            points={polygon(total, axes.map(axis => axis.values[seriesIndex] ?? 0))}
          />
        ))}

        {list.map((product, seriesIndex) =>
          axes.map((axis, i) => {
            const value = axis.values[seriesIndex];
            if (value === null || value === undefined) return null;
            const [x, y] = pointAt(i, total, value);
            return (
              <circle
                key={`dot-${seriesIndex}-${axis.label}`}
                className={`nr-radar-dot is-${SERIES[seriesIndex] || 'a'}`}
                cx={x}
                cy={y}
                r="3"
              >
                <title>{`${product.name} — ${axis.label} : ${value}/100`}</title>
              </circle>
            );
          })
        )}

        {axes.map((axis, i) => {
          const [x, y] = pointAt(i, total, 100);
          const angle = angleOf(i, total);
          const lx = CENTER + Math.cos(angle) * (RADIUS + LABEL_GAP);
          const ly = CENTER + Math.sin(angle) * (RADIUS + LABEL_GAP);
          return (
            <text
              key={`label-${axis.label}`}
              className="nr-radar-label"
              x={lx}
              y={ly}
              textAnchor={anchorFor(x)}
              dominantBaseline={y < CENTER - 4 ? 'auto' : y > CENTER + 4 ? 'hanging' : 'middle'}
            >
              {axis.label}
            </text>
          );
        })}
      </svg>

      <figcaption className="nr-radar-legend">
        {list.map((product, i) => (
          <span key={product._id || i} className={`nr-radar-key is-${SERIES[i] || 'a'}`}>
            {product.name}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

export default TechRadar;
