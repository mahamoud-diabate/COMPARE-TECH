const mongoose = require('mongoose');
// Le .env vit a la racine du backend, quel que soit le dossier depuis lequel
// on lance la commande. Sans ce chemin explicite, dotenv le cherche dans le
// dossier courant : lance depuis la racine du depot, il ne trouve rien et
// echoue en annoncant une variable absente qui est pourtant bien la.
require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });
const Telephone = require('../models/Telephone');
const Laptop = require('../models/Laptop');

/*
 * Jeu de donnees de demonstration.
 *
 * NOTE : ces produits sont generes, pas scrapes. Les valeurs sont calibrees
 * pour rester plausibles (gammes reelles de Geekbench / AnTuTu 2025) et pour
 * produire une distribution de scores etalee.
 *
 * Deux bugs corriges par rapport a la version precedente :
 *  1. imageUrl pointait vers via.placeholder.com, service ferme depuis 2025
 *     -> toutes les images etaient cassees. Remplace par des SVG data-URI,
 *        qui ne dependent d'aucun service externe.
 *  2. Les benchmarks suivaient (i % 20), donc seulement 20 valeurs distinctes
 *     pour 100 produits : 5 laptops tombaient exactement sur le meme score
 *     de 67, et aucun ne depassait 67. Remplace par un generateur pseudo-
 *     aleatoire deterministe (seed fixe) qui couvre toute la plage.
 */

// PRNG deterministe (mulberry32) : meme sortie a chaque execution,
// sans dependre de Math.random() qui rendrait les donnees instables.
function makeRng(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = makeRng(20250815);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (min, max) => Math.round(min + rand() * (max - min));

// Vignette SVG encodee en data-URI : aucune requete reseau, jamais cassee.
function placeholder(label, bg) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
<rect width="400" height="300" fill="${bg}"/>
<text x="200" y="158" font-family="Segoe UI,Arial,sans-serif" font-size="30"
 font-weight="600" fill="#ffffff" text-anchor="middle">${label}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg.replace(/\n/g, ''));
}

const PHONE_BRANDS = ['Apple', 'Samsung', 'Google', 'Xiaomi', 'Oppo', 'OnePlus', 'Motorola', 'Sony', 'Asus', 'Vivo'];
const LAPTOP_BRANDS = ['Apple', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'MSI', 'Microsoft', 'Razer', 'Gigabyte'];

const BRAND_COLOR = {
  Apple: '#4b5563', Samsung: '#1e40af', Google: '#0f766e', Xiaomi: '#c2410c',
  Oppo: '#15803d', OnePlus: '#b91c1c', Motorola: '#1d4ed8', Sony: '#111827',
  Vivo: '#6d28d9', Dell: '#075985', HP: '#0e7490', Lenovo: '#9f1239',
  Acer: '#166534', MSI: '#7f1d1d', Microsoft: '#0369a1', Razer: '#3f6212',
  Gigabyte: '#4338ca'
};

// Gammes de laptops : chacune a sa propre fourchette de performance,
// ce qui produit une vraie hierarchie au lieu d'une suite arithmetique.
const LAPTOP_TIERS = [
  { suffix: 'Air',      gb: [7000, 11000],  ramPool: [8, 16],       nits: [300, 400], batt: [10, 18], gpuPool: ['Integrated'] },
  { suffix: 'Pro',      gb: [12000, 19000], ramPool: [16, 32],      nits: [400, 600], batt: [8, 14],  gpuPool: ['Integrated', 'Nvidia RTX 4060'] },
  { suffix: 'Studio',   gb: [17000, 21500], ramPool: [32, 64],      nits: [500, 700], batt: [7, 12],  gpuPool: ['Nvidia RTX 4070', 'Nvidia RTX 4080'] },
  // Borne haute sous le diviseur du score (26000) : sinon le haut de gamme
  // sature a 100 et on recree une collision, en haut de classement cette fois.
  { suffix: 'Extreme',  gb: [21500, 25800], ramPool: [32, 64, 128], nits: [500, 800], batt: [5, 9],   gpuPool: ['Nvidia RTX 4080', 'Nvidia RTX 4090'] }
];

const PHONE_TIERS = [
  { suffix: 'SE',    antutu: [600000, 950000] },
  { suffix: '',      antutu: [950000, 1500000] },
  { suffix: 'Pro',   antutu: [1500000, 2300000] },
  { suffix: 'Ultra', antutu: [2300000, 3150000] }
];

async function populateRemaining() {
  try {
    if (!process.env.DB_URI) {
      throw new Error('DB_URI absent : cree un fichier .env a partir de .env.example');
    }

    console.log('Connexion a MongoDB...');
    await mongoose.connect(process.env.DB_URI);
    console.log('Connecte.');

    // ---------- Telephones ----------
    const phones = [];
    for (let i = 1; i <= 100; i++) {
      const brand = PHONE_BRANDS[i % PHONE_BRANDS.length];
      const tier = PHONE_TIERS[i % PHONE_TIERS.length];
      const gen = 12 + Math.floor(i / 12);
      const name = `${brand} Phone ${gen}${tier.suffix ? ' ' + tier.suffix : ''}`;

      phones.push({
        name,
        brand,
        display_size: (6.1 + between(0, 12) * 0.05).toFixed(1) + '"',
        cpu_name: brand === 'Apple' ? `A${16 + (i % 4)} Bionic` : `Snapdragon 8 Gen ${1 + (i % 4)}`,
        ram_gb: pick([8, 12, 16]),
        storage_gb: pick([128, 256, 512, 1024]),
        battery_mah: between(3800, 6000),
        imageUrl: placeholder(brand, BRAND_COLOR[brand] || '#334155'),
        antutu_score: between(tier.antutu[0], tier.antutu[1]),
        pros: ['Ecran lumineux', 'Charge rapide'],
        cons: ['Prix eleve', 'Pas de prise jack']
      });
    }
    await Telephone.deleteMany({});
    await Telephone.insertMany(phones);
    console.log(`${phones.length} telephones inseres.`);

    // ---------- Laptops ----------
    const laptops = [];
    for (let i = 1; i <= 100; i++) {
      const brand = LAPTOP_BRANDS[i % LAPTOP_BRANDS.length];
      const tier = LAPTOP_TIERS[i % LAPTOP_TIERS.length];
      const isApple = brand === 'Apple';
      const family = isApple ? 'MacBook' : 'Ultrabook';
      const gen = 2023 + (i % 3);

      laptops.push({
        name: `${brand} ${family} ${tier.suffix} ${gen}`.replace(/\s+/g, ' ').trim(),
        brand,
        cpu_name: isApple
          ? `Apple M${3 + (i % 2)}${tier.suffix === 'Extreme' ? ' Max' : tier.suffix === 'Studio' ? ' Pro' : ''}`
          : `Intel Core i${pick([5, 7, 9])}-${13 + (i % 3)}900H`,
        gpu_name: isApple ? 'Integrated' : pick(tier.gpuPool),
        ram_gb: pick(tier.ramPool),
        storage_gb: pick([256, 512, 1024, 2048]),
        imageUrl: placeholder(brand, BRAND_COLOR[brand] || '#334155'),
        geekbench_multi: between(tier.gb[0], tier.gb[1]),
        display_brightness_nits: between(tier.nits[0], tier.nits[1]),
        battery_life_hours: between(tier.batt[0], tier.batt[1]),
        pros: ['Excellente finition', 'Fin et leger'],
        cons: ['Ventilateurs audibles', 'Connectique limitee']
      });
    }
    await Laptop.deleteMany({});
    await Laptop.insertMany(laptops);
    console.log(`${laptops.length} laptops inseres.`);

    // Controle de qualite : verifie que la distribution est bien etalee.
    const scores = laptops.map(l => Math.min(100, Math.round(l.geekbench_multi / 26000 * 100)));
    const uniques = new Set(scores);
    console.log(`Scores laptops : ${uniques.size} valeurs distinctes, de ${Math.min(...scores)} a ${Math.max(...scores)}.`);
    if (uniques.size < 30) {
      console.warn('ATTENTION : distribution des scores trop concentree.');
    }

  } catch (error) {
    console.error('Erreur :', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

populateRemaining();
