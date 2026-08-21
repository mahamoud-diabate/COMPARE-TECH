const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
// Le .env vit a la racine du backend, quel que soit le dossier depuis lequel
// on lance la commande. Sans ce chemin explicite, dotenv le cherche dans le
// dossier courant : lance depuis la racine du depot, il ne trouve rien et
// echoue en annoncant une variable absente qui est pourtant bien la.
require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });
const Gpu = require('../models/Gpu');

/*
 * Releve des cartes graphiques : NOMS ET CARACTERISTIQUES UNIQUEMENT.
 *
 * Meme regle que pour les processeurs — une mesure absente reste absente. La
 * version precedente ecrivait trois valeurs inventees par produit :
 *
 *   benchmark_3dmark: Math.floor(Math.random() * 20000) + 5000   un tirage
 *   memory: memMatch ? parseInt(memMatch[1]) : 8                 8 Go par defaut
 *   pros / cons                                                  les memes pour tous
 *
 * La ligne du milieu est la plus sournoise : elle ne ressemble pas a une
 * invention, mais « 8 Go » attribue a une carte dont la page ne dit rien est
 * exactement aussi faux qu'un tirage au sort — avec l'apparence du serieux.
 *
 * Le filtre de nom est l'autre correction. Les tableaux Wikipedia melangent
 * modeles, dates et frequences dans des cellules de meme forme ; sans garde,
 * 69 des 104 « cartes » importees etaient des dates (« February6, 2002 ») ou
 * des nombres nus (« 275 »).
 *
 * A verifier avant tout usage regulier : la licence des contenus (Wikipedia est
 * en CC BY-SA, ce qui impose une attribution) et les conditions de collecte.
 */

const SOURCES = [
    { marque: 'Nvidia', url: 'https://en.wikipedia.org/wiki/List_of_Nvidia_graphics_processing_units' },
    { marque: 'AMD', url: 'https://en.wikipedia.org/wiki/List_of_AMD_graphics_processing_units' },
];

const DATE = /^(january|february|march|april|may|june|july|august|september|october|november|december)/i;

// Un modele de carte graphique porte une lettre ET un chiffre, et n'est ni une
// date, ni un nombre seul, ni un intitule de gamme.
function nomPlausible(nom) {
    if (!nom || nom.length < 3 || nom.length > 90) return false;
    if (DATE.test(nom)) return false;
    if (!/[a-z]/i.test(nom)) return false;
    if (!/\d/.test(nom)) return false;
    if (/series|family|edition/i.test(nom)) return false;
    return true;
}

async function scrapeGpus() {
    const ignores = { nom: 0 };

    try {
        console.log('Connexion a MongoDB...');
        await mongoose.connect(process.env.DB_URI);

        const gpus = [];
        const releve_le = new Date();

        for (const source of SOURCES) {
            console.log(`Lecture de ${source.url}...`);
            const { data } = await axios.get(source.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            const $ = cheerio.load(data);

            $('table.wikitable tr').each((index, element) => {
                if (gpus.length >= 100) return false;

                const row = $(element);
                const cells = row.find('td');
                if (cells.length < 5) return;

                const name = $(cells[0]).text().trim();
                if (!nomPlausible(name)) { ignores.nom++; return; }

                // La memoire n'est retenue que si la ligne l'annonce. Absente,
                // elle le reste : le frontend sait afficher une case vide, il
                // ne sait pas deviner qu'un « 8 Go » est une valeur par defaut.
                const memMatch = row.text().match(/(\d+)\s*GB/i);

                const gpu = { name, brand: source.marque };
                if (memMatch) {
                    gpu.memory_gb = parseInt(memMatch[1], 10);
                    gpu.provenance = {
                        memory_gb: { url: source.url, releve_le, extrait: memMatch[0] },
                    };
                }

                gpus.push(gpu);
            });
        }

        console.log(`${gpus.length} cartes retenues. Ecartes : ${ignores.nom} noms invalides.`);

        if (gpus.length === 0) {
            console.log('Rien a inserer — les selecteurs ont probablement change.');
            return;
        }

        await Gpu.insertMany(gpus);
        console.log(`${gpus.length} cartes inserees, sans benchmark (voir l'en-tete du fichier).`);
    } catch (error) {
        console.error('Echec du releve :', error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
        console.log('Deconnecte de MongoDB.');
    }
}

scrapeGpus();
