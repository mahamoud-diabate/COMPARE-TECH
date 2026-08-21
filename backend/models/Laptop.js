const mongoose = require('mongoose');
const { catalogue } = require('./catalogue');
const Schema = mongoose.Schema;

/*
 * Le processeur et la carte graphique d'un portable sont des fiches de nos
 * propres collections, pas du texte libre. Deux champs coexistent donc :
 *
 *   cpu_name  le libelle affiche, toujours renseigne — un portable reste
 *             lisible meme si son processeur n'a pas encore de fiche ;
 *   cpu       le lien vrai, verifie par Mongo, exploitable par `populate()`.
 *
 * Sans le lien, le frontend en est reduit a renifler la chaine — voir le
 * `/RTX|RX /.test(gpu_name)` de ProductList.jsx, qui decide d'une etiquette
 * « Jeu » sur la presence de deux lettres dans un nom.
 */
const laptopSchema = new Schema({
    name: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    cpu_name: { type: String, required: false, trim: true },
    gpu_name: { type: String, required: false, trim: true },
    cpu: { type: Schema.Types.ObjectId, ref: 'Cpu', required: false },
    gpu: { type: Schema.Types.ObjectId, ref: 'Gpu', required: false },
    ram_gb: { type: Number, required: false, min: 1, max: 1024 },
    storage_gb: { type: Number, required: false, min: 1, max: 65536 },
    imageUrl: { type: String, required: false },
    geekbench_multi: { type: Number, required: false, min: 0, max: 200000 },
    display_brightness_nits: { type: Number, required: false, min: 0, max: 10000 },
    battery_life_hours: { type: Number, required: false, min: 0, max: 100 },
    pros: [String],
    cons: [String]
});

laptopSchema.plugin(catalogue);
laptopSchema.index({ geekbench_multi: -1 });

const Laptop = mongoose.model('Laptop', laptopSchema);
module.exports = Laptop;
