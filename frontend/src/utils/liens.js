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
  return `/${type}/${produit?.slug || produit?._id}`;
}

export default cheminProduit;
