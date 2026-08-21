const mongoose = require('mongoose');
const { catalogue } = require('./catalogue');
const Schema = mongoose.Schema;

/*
 * `display_size` etait stocke unite comprise (« 6.8 pouces »). Il est desormais
 * un nombre : l'unite appartient a l'affichage, pas a la donnee — c'est le
 * catalogue de specs du frontend qui la porte deja (`unit: 'pouces'`).
 *
 * Meme principe que pour les portables : `cpu_name` affiche, `cpu` relie.
 */
const telephoneSchema = new Schema({
    name: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    display_size: { type: Number, required: false, min: 1, max: 30 },
    cpu_name: { type: String, required: false, trim: true },
    cpu: { type: Schema.Types.ObjectId, ref: 'Cpu', required: false },
    ram_gb: { type: Number, required: false, min: 1, max: 1024 },
    storage_gb: { type: Number, required: false, min: 1, max: 65536 },
    battery_mah: { type: Number, required: false, min: 0, max: 50000 },
    imageUrl: { type: String, required: false },
    antutu_score: { type: Number, required: false, min: 0, max: 10000000 },
    // Geekbench 6 execute les MEMES charges sur Android et iOS ; AnTuTu non
    // (Vulkan d'un cote, Metal de l'autre). C'est pourquoi la note du site se
    // calcule desormais sur Geekbench : sans quoi l'A18 Pro, la puce mobile la
    // plus rapide, sortait 7e derriere quatre Snapdragon. AnTuTu reste stocke
    // et affiche comme mesure, il ne decide simplement plus du classement.
    geekbench_single: { type: Number, required: false, min: 0, max: 20000 },
    geekbench_multi: { type: Number, required: false, min: 0, max: 200000 },
    pros: [String],
    cons: [String]
});

telephoneSchema.plugin(catalogue);
telephoneSchema.index({ antutu_score: -1 });

const Telephone = mongoose.model('Telephone', telephoneSchema);
module.exports = Telephone;
