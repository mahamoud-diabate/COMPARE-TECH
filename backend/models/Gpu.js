const mongoose = require('mongoose');
const { catalogue } = require('./catalogue');
const Schema = mongoose.Schema;

const gpuSchema = new Schema({
  name: { type: String, required: true, trim: true },
  brand: { type: String, required: true, trim: true },
  // « Unites de calcul » cote affichage : des milliers de coeurs CUDA ou de
  // processeurs de flux, sans commune mesure avec les coeurs d'un CPU.
  cores: { type: Number, required: false, min: 1, max: 100000 },
  memory_gb: { type: Number, required: false, min: 0, max: 256 },
  memory_type: { type: String, required: false, trim: true },
  tdp_w: { type: Number, required: false, min: 1, max: 1000 },
  imageUrl: { type: String, required: false },
  benchmark_3dmark: { type: Number, required: false, min: 0, max: 200000 },
  // Images par seconde moyennes en jeu, reglages Ultra : la mesure la plus
  // proche de ce que vit le joueur (profil « Jeu », docs/PROPOSITION-USAGES.md).
  fps_1080p: { type: Number, required: false, min: 0, max: 2000 },
  fps_1440p: { type: Number, required: false, min: 0, max: 2000 },
  fps_4k: { type: Number, required: false, min: 0, max: 2000 },
  pros: [String],
  cons: [String],
});

gpuSchema.plugin(catalogue);
gpuSchema.index({ benchmark_3dmark: -1 });

const Gpu = mongoose.model('Gpu', gpuSchema);
module.exports = Gpu;
