import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import ProductPicker from './ProductPicker';
import { useCollection } from '../hooks/useCollection';
import { usePageTitle } from '../hooks/usePageTitle';
import { getProductScore } from '../utils/scores';
import { RADAR_AXES } from '../utils/radarAxes';

const TYPES = [
  { type: 'telephone', collection: 'telephones', label: 'Téléphones', singular: 'téléphone' },
  { type: 'laptop', collection: 'laptops', label: 'Ordinateurs portables', singular: 'ordinateur portable' },
  { type: 'cpu', collection: 'cpus', label: 'Processeurs', singular: 'processeur' },
  { type: 'gpu', collection: 'gpus', label: 'Cartes graphiques', singular: 'carte graphique' },
];

/**
 * Point de départ d'une comparaison : deux champs, un bouton.
 *
 * Auparavant, `/compare` sans produits était une impasse — un message invitant
 * à retourner sur une page catégorie pour y cocher des cases. On ne pouvait
 * donc pas partager, mettre en favori, ni même deviner l'existence d'une page
 * de comparaison. C'est pourtant la promesse du site.
 *
 * La comparaison se fait au sein d'une même catégorie : opposer un processeur
 * à un téléphone n'a pas de sens, et les échelles de score ne sont pas
 * comparables entre catégories.
 */
function CompareSelector({ type: initialType }) {
  const [type, setType] = useState(
    () => TYPES.find(t => t.type === initialType)?.type || 'telephone'
  );
  const [first, setFirst] = useState(null);
  const [second, setSecond] = useState(null);
  const navigate = useNavigate();

  const meta = TYPES.find(t => t.type === type);
  const { data, loading } = useCollection(meta.collection);

  usePageTitle(
    `Comparer ${meta.label.toLowerCase()}`,
    `Sélectionnez ${meta.label.toLowerCase()} et obtenez leurs écarts mesurés, critère par critère.`
  );

  // Critères annoncés dans l'introduction : lus depuis la définition des axes,
  // pas recopiés à la main. Ajouter un axe met le texte à jour tout seul, et
  // la promesse ne peut pas se désynchroniser de ce que la page affiche.
  const criteres = (RADAR_AXES[type] || [])
    .map(axis => axis.label.toLowerCase())
    .join(', ');

  // Confrontations proposées : les voisins immédiats du classement. C'est là
  // que la question « lequel prendre » se pose vraiment — opposer le premier
  // au dernier n'apprend rien.
  const matchups = useMemo(() => {
    const ranked = [...data]
      .map(p => ({ product: p, score: getProductScore(p, type) }))
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 25);

    return ranked
      .slice(0, -1)
      .map((entry, i) => [entry.product, ranked[i + 1].product]);
  }, [data, type]);

  const ready = first && second && first._id !== second._id;

  const submit = (e) => {
    e.preventDefault();
    if (ready) navigate(`/compare?type=${type}&ids=${first._id},${second._id}`);
  };

  const switchType = (next) => {
    setType(next);
    setFirst(null);
    setSecond(null);
  };

  return (
    <div className="nr-main">
      <div className="nr-breadcrumb">
        <span><Link to="/">Accueil</Link></span>
        <span>Comparer</span>
      </div>

      <section className="nr-card">
        <div className="nr-card-head">
          <h1 className="nr-title-h1">Comparer {meta.label.toLowerCase()}</h1>
          <p className="nr-text-gray-small" style={{ marginBottom: 12 }}>
            {data.length > 0 && `${data.length} ${meta.label.toLowerCase()} au catalogue. `}
            Sélectionnez vos modèles : vous obtiendrez leurs écarts chiffrés
            {criteres && `, une note sur 100 par critère — ${criteres} —`} et le tableau
            complet des caractéristiques.
          </p>
        </div>

        <div className="nr-anchor-nav" role="tablist" aria-label="Catégorie à comparer">
          {TYPES.map(item => (
            <button
              key={item.type}
              type="button"
              role="tab"
              aria-selected={item.type === type}
              className={item.type === type ? 'is-active' : ''}
              onClick={() => switchType(item.type)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <form className="nr-card-body" onSubmit={submit}>
          <ProductPicker
            label={`Premier ${meta.singular}`}
            products={data}
            value={first}
            onChange={setFirst}
            exclude={second?._id}
            placeholder={loading ? 'Chargement du catalogue…' : `Nom du premier ${meta.singular}`}
          />

          <div className="nr-versus-word">VS</div>

          <ProductPicker
            label={`Second ${meta.singular}`}
            products={data}
            value={second}
            onChange={setSecond}
            exclude={first?._id}
            placeholder={loading ? 'Chargement du catalogue…' : `Nom du second ${meta.singular}`}
          />

          <button className="nr-btn" type="submit" disabled={!ready} style={{ marginTop: 16 }}>
            Comparer
          </button>
        </form>
      </section>

      {matchups.length > 0 && (
        <section className="nr-card">
          <div className="nr-card-head">
            <h2 className="nr-title-h2">Confrontations serrées</h2>
            <p className="nr-text-gray-small">
              Les modèles qui se suivent au classement — ceux entre lesquels le choix se joue.
            </p>
          </div>
          <div className="nr-card-body" style={{ paddingTop: 8 }}>
            <ul className="nr-matchups">
              {matchups.map(([a, b]) => (
                <li key={`${a._id}-${b._id}`}>
                  <Link to={`/compare?type=${type}&ids=${a._id},${b._id}`}>
                    {a.name} <span className="nr-versus-inline">vs</span> {b.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

export default CompareSelector;
