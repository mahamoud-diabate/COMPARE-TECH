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
    imageUrl: { type: String, required: false },
    benchmark_3dmark: { type: Number, required: false, min: 0, max: 200000 },
    pros: [String],
    cons: [String]
});

gpuSchema.plugin(catalogue);
gpuSchema.index({ benchmark_3dmark: -1 });

const Gpu = mongoose.model('Gpu', gpuSchema);
module.exports = Gpu;
