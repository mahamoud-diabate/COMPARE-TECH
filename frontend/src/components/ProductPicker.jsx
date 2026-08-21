import React, { useState, useRef, useEffect, useId } from 'react';
import { Check } from 'lucide-react';

/**
 * Champ de recherche à complétion, pour désigner un produit précis.
 *
 * Implémenté en combobox conforme (`role="combobox"` + liste `role="listbox"`,
 * `aria-activedescendant`, navigation au clavier) plutôt qu'en simple champ
 * texte : sans cela, la liste de suggestions n'existe que pour ceux qui la
 * voient et qui peuvent cliquer dessus.
 *
 * La coche à droite n'apparaît que lorsqu'un produit de la liste a réellement
 * été retenu. Un texte saisi qui ressemble à un nom ne vaut pas sélection —
 * c'est la différence entre « j'ai tapé quelque chose » et « le comparateur
 * sait de quel produit je parle ».
 */
function ProductPicker({ label, products = [], value, onChange, exclude, placeholder }) {
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);
  const listId = useId();

  useEffect(() => {
    setTerm(value?.name || '');
  }, [value]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const needle = term.trim().toLowerCase();
  const matches =
    needle.length < 1 || term === value?.name
      ? []
      : products
          .filter(p => p._id !== exclude)
          .filter(
            p =>
              (p.name || '').toLowerCase().includes(needle) ||
              (p.brand || '').toLowerCase().includes(needle)
          )
          .slice(0, 8);

  const select = (product) => {
    onChange(product);
    setTerm(product.name);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open || matches.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => (h + 1) % matches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => (h - 1 + matches.length) % matches.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      select(matches[highlight] || matches[0]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const expanded = open && matches.length > 0;

  return (
    <div className="ct-picker" ref={wrapRef}>
      <div className="ct-picker-field">
        <input
          className="ct-picker-input"
          type="text"
          role="combobox"
          aria-label={label}
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={expanded ? `${listId}-${highlight}` : undefined}
          autoComplete="off"
          placeholder={placeholder}
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setHighlight(0);
            setOpen(true);
            if (value) onChange(null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <span className="ct-picker-mark" aria-hidden="true">
          {value && <Check size={18} strokeWidth={2.5} />}
        </span>
      </div>

      <ul className="ct-picker-list" id={listId} role="listbox" hidden={!expanded}>
        {matches.map((product, i) => (
          <li
            key={product._id}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === highlight}
            className={i === highlight ? 'is-active' : undefined}
            onMouseEnter={() => setHighlight(i)}
            onMouseDown={(e) => { e.preventDefault(); select(product); }}
          >
            <strong>{product.name}</strong>
            <span className="ct-text-gray-small">{product.brand}</span>
          </li>
        ))}
      </ul>

      <span className="ct-visually-hidden" role="status" aria-live="polite">
        {expanded
          ? `${matches.length} résultat${matches.length > 1 ? 's' : ''}`
          : 'Commencez à taper pour voir des résultats.'}
      </span>
    </div>
  );
}

export default ProductPicker;
