const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
// Le .env vit a la racine du backend, quel que soit le dossier depuis lequel
// on lance la commande. Sans ce chemin explicite, dotenv le cherche dans le
// dossier courant : lance depuis la racine du depot, il ne trouve rien et
// echoue en annoncant une variable absente qui est pourtant bien la.
require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });
const Cpu = require('../models/Cpu');

/*
 * Releve des processeurs : NOMS ET CARACTERISTIQUES UNIQUEMENT.
 *
 * Ce script ne pose aucun benchmark. C'est deliberé, et c'est le point le plus
 * important du fichier : la version precedente ecrivait
 *
 *     geekbench_multi: Math.floor(Math.random() * 15000) + 5000
 *
 * — un tirage au sort, insere dans le champ sur lequel repose toute la note du
 * site. Melange a de vrais noms de processeurs, un chiffre invente est
 * indetectable : personne ne peut plus distinguer une mesure d'une invention.
 *
 * Regle appliquee partout ici : UNE MESURE ABSENTE RESTE ABSENTE. Un produit
 * sans benchmark s'affiche « non note », ce que l'interface sait faire, plutot
 * que muni d'un score credible et faux.
 *
 * Le benchmark doit donc venir d'une source reelle, dans un second temps. Tant
 * que ce n'est pas fait, ce script remplit le catalogue mais pas le classement.
 *
 * A verifier avant tout usage regulier : les conditions d'utilisation de la
 * source. Une page publique n'est pas une autorisation de collecte automatisee.
 */

const SCRAPE_URL = 'https://www.notebookcheck.net/Mobile-Processors-Benchmark-List.2436.0.html';

// Un nom de processeur contient au moins une lettre et un chiffre, et n'est ni
// une date ni un nombre nu. C'est ce filtre qui manquait au releve des cartes
// graphiques : 69 cellules de tableau (« February6, 2002 », « 275 ») y sont
// entrees comme autant de produits.
const DATE = /^(janvier|february|january|march|april|may|june|july|august|september|october|november|december)/i;

function nomPlausible(nom) {
    if (!nom || nom.length < 3 || nom.length > 90) return false;
    if (DATE.test(nom)) return false;
    if (!/[a-z]/i.test(nom)) return false;
    return true;
}

function marqueDepuisLeNom(nom) {
    const n = nom.toLowerCase();
    if (n.includes('intel') || n.includes('core ')) return 'Intel';
    if (n.includes('amd') || n.includes('ryzen')) return 'AMD';
    if (n.includes('apple')) return 'Apple';
    if (n.includes('snapdragon') || n.includes('qualcomm')) return 'Qualcomm';
    if (n.includes('dimensity') || n.includes('mediatek')) return 'MediaTek';
    return null;
}

async function scrapeCpus() {
    const ignores = { nom: 0, marque: 0, coeurs: 0 };

    try {
        console.log('Connexion a MongoDB...');
        await mongoose.connect(process.env.DB_URI);

        console.log(`Lecture de ${SCRAPE_URL}...`);
        const { data } = await axios.get(SCRAPE_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        const cpus = [];
        const releve_le = new Date();

        $('tr.odd, tr.even, tr.desk_odd, tr.desk_even, tr.smartphone_odd, tr.smartphone_even').each((index, element) => {
            if (cpus.length >= 100) return false;

            const row = $(element);
            const nameLink = row.find('td:nth-child(2) a');
            const name = nameLink.text().trim() || row.find('td:nth-child(2)').text().trim();

            if (name === 'Model') return;
            if (!nomPlausible(name)) { ignores.nom++; return; }

            // La marque est deduite du nom. Quand elle ne l'est pas, la ligne
            // est ecartee : « Other » n'est pas une marque, c'est un aveu
            // d'ignorance range dans un champ obligatoire.
            const brand = marqueDepuisLeNom(name);
            if (!brand) { ignores.marque++; return; }

            const coeurs = row.find('td:nth-child(8)').text().trim();
            const ct = coeurs.match(/(\d+)\s*\/\s*(\d+)/);
            const cores = ct ? parseInt(ct[1], 10) : parseInt(coeurs, 10);
            if (!Number.isFinite(cores) || cores <= 0) { ignores.coeurs++; return; }

            cpus.push({
                name,
                brand,
                cores,
                threads: ct ? parseInt(ct[2], 10) : cores,
                // Ni imageUrl ni pros/cons : la page ne les fournit pas.
                // L'ancienne version pointait vers via.placeholder.com, ferme
                // depuis 2025, et attribuait a chaque processeur les memes
                // deux qualites et le meme defaut.
                // Une entree de provenance par mesure relevee : c'est ce que
                // `scripts/import.js` sait rejouer pour reverifier un chiffre.
                provenance: {
                    cores: { url: SCRAPE_URL, releve_le, extrait: coeurs },
                    threads: { url: SCRAPE_URL, releve_le, extrait: coeurs },
                },
            });
        });

        console.log(
            `${cpus.length} processeurs retenus. Ecartes : ` +
            `${ignores.nom} nom invalide, ${ignores.marque} marque indeterminee, ` +
            `${ignores.coeurs} nombre de coeurs illisible.`
        );

        if (cpus.length === 0) {
            console.log('Rien a inserer — les selecteurs ont probablement change.');
            return;
        }

        await Cpu.insertMany(cpus);
        console.log(`${cpus.length} processeurs inseres, sans benchmark (voir l'en-tete du fichier).`);
    } catch (error) {
        console.error('Echec du releve :', error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
        console.log('Deconnecte de MongoDB.');
    }
}

scrapeCpus();
