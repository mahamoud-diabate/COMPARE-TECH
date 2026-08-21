import React from 'react';

/**
 * Filtres d'une page catégorie.
 *
 * Cases à cocher toujours dépliées : l'accordéon précédent demandait un clic
 * pour découvrir quels filtres existaient, alors que la liste tient
 * intégralement dans la colonne.
 */
function FilterSidebar({
  filters = [],
  selectedFilters = {},
  onFilterChange,
  searchTerm = '',
  onSearchChange,
  onReset,
}) {
  const activeCount = Object.values(selectedFilters).reduce(
    (total, values) => total + (values?.length || 0),
    0
  );

  return (
    <aside className="ct-card" style={{ position: 'sticky', top: 68 }}>
      <div className="ct-toolbar">
        <span style={{ fontWeight: 600 }}>Filtres</span>
        {activeCount > 0 && (
          <button className="ct-btn ct-btn-ghost ct-btn-sm" onClick={onReset}>
            Réinitialiser ({activeCount})
          </button>
        )}
      </div>

      <div className="ct-card-body-tight">
        <input
          className="ct-input"
          style={{ width: '100%' }}
          type="search"
          placeholder="Filtrer par nom…"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Filtrer la liste par nom"
        />
      </div>

      {filters.map(group => (
        <div key={group.id}>
          <hr className="ct-card-sep" />
          <div className="ct-card-body-tight">
            <div className="ct-label" style={{ marginBottom: 6 }}>{group.label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {group.options.map(option => {
                const on = selectedFilters[group.id]?.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    className={`ct-chip${on ? ' is-on' : ''}`}
                    onClick={() => onFilterChange(group.id, option)}
                    aria-pressed={on}
                  >
                    {group.unit ? `${option} ${group.unit}` : option}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </aside>
  );
}

export default FilterSidebar;
