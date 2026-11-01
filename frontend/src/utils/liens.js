/*
 * Construction des adresses de fiche produit.
 *
 * Le slug passe avant l'identifiant Mongo, pour une raison qui n'est pas
 * cosmétique : l'identifiant change à chaque réimport de la collection. Vider
 * puis recharger `cpus` réattribue 136 nouveaux `_id`, et tous les liens
 * partagés, mis en favori ou indexés pointent alors dans le vide. Le slug est
 * dérivé du nom : il traverse l'opération intact.
 *
 * Le repli sur `_id` reste nécessaire tant que la base contient des documents
 * importés avant l'ajout du champ. L'API accepte les deux formes — voir la
 * route `/api/:segment/:id` dans `backend/server.js`.
 */

/**
 * @param {string} type    'cpu' | 'gpu' | 'laptop' | 'telephone'
 * @param {object} produit le document, porteur d'un `slug` et/ou d'un `_id`
 * @returns {string} le chemin de la fiche
 */
export function cheminProduit(type, produit) {
  const ref = produit?.slug || produit?._id;
  return ref ? `/${type}/${ref}` : `/${type}`;
}

/**
 * Remet les produits renvoyés par l'API dans l'ordre de l'adresse.
 *
 * `POST /:segment/compare` renvoie les fiches dans l'ordre de la base. Or
 * l'ordre de l'adresse est celui que le visiteur a choisi (« ce portable
 * contre celui-là ») : les cartes, les colonnes et le verdict doivent le
 * suivre. Un produit introuvable est simplement absent.
 *
 * @param {object[]} produits  réponse de l'API
 * @param {string[]} cles      slugs ou identifiants, dans l'ordre de l'adresse
 */
export function ordreDeLaDemande(produits, cles) {
  const rang = p => {
    const i = cles.findIndex(c => c && (c === p?.slug || c === String(p?._id)));
    return i === -1 ? cles.length : i;
  };
  return [...produits].sort((a, b) => rang(a) - rang(b));
}

export default cheminProduit;
