const mongoose = require('mongoose');
const { catalogue } = require('./catalogue');
const Schema = mongoose.Schema;

/*
 * Les frequences etaient stockees en `String` (« 5.7 »), ce qui forcait le
 * frontend a en extraire le nombre par expression reguliere avant tout calcul
 * de graphique. Elles sont desormais typees, avec une plage de validite : une
 * frequence de 570 GHz est une faute de saisie, pas un processeur d'exception,
 * et mieux vaut la refuser a l'ecriture que la voir ecraser l'echelle du radar.
 */
const cpuSchema = new Schema({
  name: { type: String, required: true, trim: true },
  brand: { type: String, required: true, trim: true },
  cores: { type: Number, required: true, min: 1, max: 512 },
  threads: { type: Number, required: false, min: 1, max: 1024 },
  max_freq_ghz: { type: Number, required: false, min: 0, max: 10 },
  base_freq_ghz: { type: Number, required: false, min: 0, max: 10 },
  tdp_w: { type: Number, required: false, min: 1, max: 1000 },
  // Plateforme et age : ce qui dit combien de temps on pourra faire evoluer la
  // machine (notes par usage, profil « Longevite », docs/PROJECT_CONTEXT.md §9).
  socket: { type: String, required: false, trim: true, maxlength: 40 },
  annee_sortie: { type: Number, required: false, min: 1990, max: 2100 },
  cache_l3_mo: { type: Number, required: false, min: 0, max: 4096 },
  // Second test de calcul, centre sur le rendu 3D : il departage la ou
  // Geekbench, plus generaliste, peut se tromper sur les charges longues.
  cinebench_2024_multi: { type: Number, required: false, min: 0, max: 50000 },
  imageUrl: { type: String, required: false },
  geekbench_single: { type: Number, required: false, min: 0, max: 20000 },
  geekbench_multi: { type: Number, required: false, min: 0, max: 200000 },
  pros: [String],
  cons: [String],
});

cpuSchema.plugin(catalogue);

// Tri par defaut du classement. Gratuit a cette echelle, utile a la suivante.
cpuSchema.index({ geekbench_multi: -1 });

const Cpu = mongoose.model('Cpu', cpuSchema);
module.exports = Cpu;
