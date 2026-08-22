/*
 * Enregistreur vidéo des démonstrations (MP4 + WebM, 1920×1080) pour le portfolio.
 *
 * Reprend la logique de record-demo.mjs (curseur factice, images horodatées,
 * défilement animé) mais assemble en vidéo H.264/VP9 au lieu de GIF.
 *
 *   npm i puppeteer-core
 *   DEMO_URL=https://compare-tech-king2mos-projects.vercel.app node docs/record-video.mjs comparaison
 */
import puppeteer from 'puppeteer-core';
import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

const BASE = process.env.DEMO_URL || 'http://localhost:5173';
const ICI = new URL('.', import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/, '');
const TRAVAIL = join(ICI, '.frames');

const CANDIDATS = [
  process.env.DEMO_BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
].filter(Boolean);
const NAVIGATEUR = CANDIDATS.find((c) => existsSync(c));
if (!NAVIGATEUR) { console.error('Aucun Chromium trouvé.'); process.exit(1); }

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

const CURSEUR = `
(() => {
  if (document.getElementById('__cur')) return;
  const style = document.createElement('style');
  style.textContent = [
    '#__cur{position:fixed;left:0;top:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;will-change:transform;transform:translate(-100px,-100px)}',
    '#__cur svg{display:block;filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))}',
    '#__cur.__down svg{transform:scale(.82);transition:transform .08s}',
    '#__ring{position:fixed;left:0;top:0;width:38px;height:38px;margin:-19px 0 0 -19px;border-radius:50%;z-index:2147483646;pointer-events:none;opacity:0;background:radial-gradient(circle,rgba(56,132,255,.45) 0%,rgba(56,132,255,0) 70%)}',
    '#__ring.__go{animation:__pulse .45s ease-out}',
    '@keyframes __pulse{0%{opacity:.9;transform:scale(.3)}100%{opacity:0;transform:scale(1.4)}}',
    'html{scrollbar-width:none}',
    'html::-webkit-scrollbar,body::-webkit-scrollbar{display:none}',
  ].join('');
  document.head.appendChild(style);
  const onde = document.createElement('div'); onde.id = '__ring'; document.body.appendChild(onde);
  const fleche = document.createElement('div'); fleche.id = '__cur';
  fleche.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 1.6 17.4 10.2 10.7 11.3 7.9 18Z" fill="#fff" stroke="#111" stroke-width="1.3" stroke-linejoin="round"/></svg>';
  document.body.appendChild(fleche);
  window.__cur = { x: -100, y: -100 };
  window.__curTo = (x, y) => { window.__cur = { x, y }; fleche.style.transform = 'translate(' + x + 'px,' + y + 'px)'; };
  window.__curDown = () => { fleche.classList.add('__down'); onde.style.left = window.__cur.x + 'px'; onde.style.top = window.__cur.y + 'px'; onde.classList.remove('__go'); void onde.offsetWidth; onde.classList.add('__go'); };
  window.__curUp = () => fleche.classList.remove('__down');
})();
`;

class Enregistreur {
  constructor(page, client, dossier) {
    this.page = page; this.client = client; this.dossier = dossier;
    this.images = []; this.actif = false;
  }
  async curseur() { await this.page.evaluate(CURSEUR).catch(() => {}); }
  demarrer() {
    this.actif = true;
    const debut = Date.now();
    this.boucle = (async () => {
      while (this.actif) {
        const instant = Date.now();
        try {
          const { data } = await this.client.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, captureBeyondViewport: false });
          this.images.push({ t: instant - debut, data });
        } catch {}
        const passe = Date.now() - instant;
        if (passe < 62) await attendre(62 - passe);
      }
    })();
  }
  async arreter() { this.actif = false; await this.boucle; }
  pause(ms) { return attendre(ms); }
  async versSelecteur(selecteur, etapes = 22) {
    const cible = await this.page.$eval(selecteur, (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    const depart = await this.page.evaluate(() => window.__cur || { x: 0, y: 0 });
    for (let i = 1; i <= etapes; i++) {
      const a = i / etapes;
      const lisse = a < 0.5 ? 2 * a * a : 1 - Math.pow(-2 * a + 2, 2) / 2;
      const x = depart.x + (cible.x - depart.x) * lisse;
      const y = depart.y + (cible.y - depart.y) * lisse;
      await this.page.evaluate((X, Y) => window.__curTo(X, Y), x, y);
      await this.page.mouse.move(x, y);
      await attendre(16);
    }
  }
  async clic(selecteur, { repos = 350 } = {}) {
    await this.versSelecteur(selecteur);
    await attendre(160);
    await this.page.evaluate(() => window.__curDown());
    await this.page.mouse.down(); await attendre(90); await this.page.mouse.up();
    await this.page.evaluate(() => window.__curUp());
    await attendre(repos);
  }
  saisir(selecteur, texte, delai = 70) { return this.page.type(selecteur, texte, { delay: delai }); }
  defiler(distance, duree = 1400) {
    return this.page.evaluate(async (pixels, ms) => {
      const depart = window.scrollY;
      const t0 = performance.now();
      await new Promise((fini) => {
        const etape = (maintenant) => {
          const avancement = Math.min(1, (maintenant - t0) / ms);
          const lisse = avancement < 0.5 ? 2 * avancement * avancement : 1 - Math.pow(-2 * avancement + 2, 2) / 2;
          window.scrollTo(0, depart + pixels * lisse);
          avancement < 1 ? requestAnimationFrame(etape) : fini();
        };
        requestAnimationFrame(etape);
      });
    }, distance, duree);
  }
  async aller(chemin) {
    await this.page.goto(BASE + chemin, { waitUntil: 'networkidle2', timeout: 25000 }).catch(() => {});
    await this.curseur();
  }
  ecrire() {
    rmSync(this.dossier, { recursive: true, force: true });
    mkdirSync(this.dossier, { recursive: true });
    const lignes = [];
    this.images.forEach((img, i) => {
      const nom = `f${String(i).padStart(5, '0')}.jpg`;
      writeFileSync(join(this.dossier, nom), Buffer.from(img.data, 'base64'));
      const suiv = this.images[i + 1];
      const duree = suiv ? (suiv.t - img.t) / 1000 : 1.4;
      lignes.push(`file '${nom}'`, `duration ${Math.max(0.03, duree).toFixed(3)}`);
    });
    lignes.push(`file 'f${String(this.images.length - 1).padStart(5, '0')}.jpg'`);
    writeFileSync(join(this.dossier, 'list.txt'), lignes.join('\n'));
  }
}

const SCENARIOS = {
  async comparaison(rec) {
    await rec.aller('/compare?type=gpu');
    await attendre(1600);
    rec.demarrer();
    await rec.pause(500);
    await rec.clic('.ct-picker-input');
    await rec.saisir('.ct-picker-input', 'RTX 4090', 70);
    await rec.pause(650);
    await rec.page.keyboard.press('Enter');
    await rec.pause(450);
    const champs = await rec.page.$$('.ct-picker-input');
    await rec.versSelecteur('.ct-picker:last-of-type .ct-picker-input').catch(() => {});
    await champs[1].click();
    await rec.page.keyboard.type('RX 7900 XTX', { delay: 70 });
    await rec.pause(650);
    await rec.page.keyboard.press('Enter');
    await rec.pause(550);
    await rec.clic('button.ct-btn[type="submit"]', { repos: 1800 });
    await rec.curseur();
    await rec.pause(800);
    await rec.defiler(700, 1400);
    await rec.pause(600);
    await rec.defiler(750, 1400);
    await rec.pause(600);
    await rec.defiler(800, 1400);
    await rec.pause(1200);
    await rec.arreter();
  },
};

function assembler(dossier, nom) {
  const manifest = join(dossier, 'list.txt');
  for (const [ext, vcodec, extra] of [
    ['mp4', 'libx264', ['-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium']],
    ['webm', 'libvpx-vp9', ['-pix_fmt', 'yuv420p', '-crf', '34', '-b:v', '0']],
  ]) {
    execFileSync('ffmpeg', [
      '-y', '-f', 'concat', '-safe', '0', '-i', manifest,
      '-vf', 'fps=30,scale=1920:1080:flags=lanczos',
      '-c:v', vcodec, ...extra, '-an',
      join(ICI, `demo-${nom}.${ext}`),
    ], { stdio: 'ignore' });
  }
  console.log(`  → demo-${nom}.mp4 + .webm`);
}

const demandes = process.argv.slice(2).filter((n) => SCENARIOS[n]);
const liste = demandes.length ? demandes : Object.keys(SCENARIOS);

const navigateur = await puppeteer.launch({
  executablePath: NAVIGATEUR,
  headless: true,
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1.5 },
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars', '--font-render-hinting=none'],
});

for (const nom of liste) {
  console.log(`▶ ${nom}`);
  const page = await navigateur.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1.5 });
  const client = await page.createCDPSession();
  const rec = new Enregistreur(page, client, join(TRAVAIL, nom));
  try {
    await SCENARIOS[nom](rec);
  } catch (err) {
    rec.actif = false;
    await rec.boucle?.catch(() => {});
    console.error(`  échec : ${err.message}`);
  }
  if (rec.images.length) {
    rec.ecrire();
    assembler(join(TRAVAIL, nom), nom);
  }
  await page.close();
}

await navigateur.close();
rmSync(TRAVAIL, { recursive: true, force: true });
